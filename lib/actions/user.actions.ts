'use server'


import { cookies } from "next/headers";
import { parseStringify } from "../utils";
import { get } from "http";
import { access } from "fs";
import { create } from "domain";
import { createAdminClient, createSessionClient } from "../appwrite";
import { ID, Query } from "node-appwrite";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
    APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    )

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const signIn = async ({ email, password }:  signInProps) => {
    try {
        const { account } = await createAdminClient();
        const response = await account.createEmailPasswordSession(
            email,
            password,
        );

        (await cookies()).set("appwrite-session", response.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        const user = await getUserInfo({ userId: response.userId });


        return parseStringify(user);
    } catch (error) {
        console.error('Error during sign-in:', error);
        throw error; // Rethrow the error
    }
}

export const signUp = async ({password, ...userData}: SignUpParams) => {
    let newUserAccount;

    const { firstName, lastName, email} = userData;
    try {
         const { account, database } = await createAdminClient();

        newUserAccount = await account.create(
            ID.unique(),
            email,
            password,
            `${firstName} ${lastName}`,
        );

        if(!newUserAccount) throw new Error('Error creating user');

        const newUser = await database.createDocument(
          DATABASE_ID!,
          USER_COLLECTION_ID!,
          ID.unique(),
          {
              ...userData,
              userId: newUserAccount.$id,
          }
        );

        if(!newUser) throw new Error('Error creating user document');

        // Automatically create a “Cash” bank
        await createManualBankAccount(newUser.$id);
        console.log( "the new user account id is ",newUser.$id);
        

        const session = await account.createEmailPasswordSession(
            email,
            password
        );

        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify(newUser);

    } catch (error) {
        console.log('Error', error);
    } 
}

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result = await account.get();
    const user = await getUserInfo({ userId: result.$id });

    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logOutAccount = async () => {
    try {
        const { account } = await createSessionClient();
        (await cookies()).delete("appwrite-session");

        await account.deleteSession("current");

    } catch (error) {
        return null;
    }
}

export async function getAccountDetails(accountId: string) {
  try {
    const res = await fetch(`https://api.withmono.com/v2/accounts/${accountId}`, {
      headers: { "mono-sec-key": process.env.MONO_SECRET_KEY! },
      cache: "no-store",
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Mono account details error:", errData);
      throw new Error("Failed to fetch account details");
    }

    return res.json();
  } catch (err) {
    console.error("Network/Unexpected error:", err);
    throw new Error("Unable to fetch account details");
  }
}

export const createBankAccount = async ({
  accessToken,
  docId,
  email,
  firstName,
  lastName,
  phone,
}: createBankAccountProps) => {
  try {
    // Fetch account details from Mono API
    const account = await getAccountDetails(accessToken);

    // Validate the account details
    if (!account || !account.data) {
      throw new Error("Invalid account details received from Mono API");
    }

    const { account: bankAccount, customer } = account.data;

    if (!bankAccount || !customer) {
      throw new Error("Missing account or customer details in Mono API response");
    }

    // Ensure environment variables are defined
    if (!DATABASE_ID || !BANK_COLLECTION_ID) {
      throw new Error("Missing DATABASE_ID or BANK_COLLECTION_ID in environment variables");
    }
    
    // Create the bank account document in Appwrite
    const { database } = await createAdminClient();
    const newBankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId: docId,
        accesstoken: accessToken,
        bankId: bankAccount.id,
        accountId: customer.id,
      }
    );

    console.log("Bank account created in Appwrite:", newBankAccount);
    return parseStringify(newBankAccount);
  } catch (error) {
    console.error("Error creating bank account:", error); // Log the error
    throw new Error("Failed to create bank account"); // Rethrow the error
  }
};

export const createManualBankAccount = async (userId: string) => {
  const { database } = await createAdminClient();

  const newBankAccount = await database.createDocument(
    DATABASE_ID!,
    BANK_COLLECTION_ID!,
    ID.unique(),
    {
      userId,
      accesstoken: "none",
      bankId: "manual-cash",
      accountId: `cash-${userId}`,
    }
  );

  console.log("Manual cash bank created:", newBankAccount);
  return parseStringify(newBankAccount);
};

export async function initiateMonoLinking(name: string, email: string) {
  const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY;
  if (!MONO_SECRET_KEY) throw new Error("Missing MONO_SECRET_KEY");

  const resp = await fetch("https://api.withmono.com/v2/accounts/initiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "mono-sec-key": MONO_SECRET_KEY,
    },
    body: JSON.stringify({
      customer: { name, email },
      meta: { ref: `user-${Date.now()}` },
      scope: "auth",
      redirect_url: "http://localhost:3000", // change for prod
    }),
    cache: "no-store",
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(`Mono initiate error: ${JSON.stringify(data)}`);
  }

  return data; // contains init_code
}


export async function exchangeMonoCode(code: string) {
  const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY;
  if (!MONO_SECRET_KEY) throw new Error("Missing MONO_SECRET_KEY");

  const resp = await fetch("https://api.withmono.com/v2/accounts/auth", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "mono-sec-key": MONO_SECRET_KEY,
      Authorization: `Bearer ${MONO_SECRET_KEY}`, // Include the secret key as a Bearer token
    },
    body: JSON.stringify({ code }), // Pass the `code` in the body
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Mono API error: ${JSON.stringify(data)}`);
  }

  // Response includes account_id (id field)
  return data; // e.g. { id: "...", user: "...", ... }
}

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();

    // Query the userId field directly with the document ID
    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])] // Pass the userId directly
    );

     // Sort so "manual-cash" is always last
    const orderedBanks = banks.documents.sort((a, b) => {
      if (a.bankId === "manual-cash") return 1;  // move manual-cash down
      if (b.bankId === "manual-cash") return -1; // move manual-cash up
      return 0;
    });

    console.log("Banks found:", orderedBanks); // Debugging
    return parseStringify(orderedBanks);
  } catch (error) {
    console.error("Error in getBanks:", error);
  }
};

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [documentId])]
    )

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('accountId', [accountId])]
    )

    if(bank.total !== 1) return null;

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const getTransactionsByBankId = async ({ bankId }: { bankId: string }) => {
  try {
    // Make sure env variables exist
    if (!DATABASE_ID || !TRANSACTION_COLLECTION_ID) {
      throw new Error("Missing DATABASE_ID or TRANSACTION_COLLECTION_ID");
    }

    // Create Appwrite admin client
    const { database } = await createAdminClient();

    // Fetch all transactions that belong to this bankId
    const transactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [
        Query.equal("bankId", bankId),
        Query.orderDesc("$createdAt"), // latest first
      ]
    );

    return parseStringify(transactions);
  } catch (error) {
    console.error("Error fetching transactions by bankId:", error);
    throw new Error("Failed to fetch transactions by bankId");
  }
};

export const createManualTransaction = async ({
  userId,
  bankId,
  name,
  amount,
  type,
  category,
}: {
  userId: string;
  bankId: string;
  name: string;
  amount: number;
  type: string;
  category?: string;
}) => {
  try {
    const { database } = await createAdminClient();

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        name,
        amount,
        type,
        category: category || "General",
      }
    );

    return newTransaction;
  } catch (error) {
    console.error("Error creating manual transaction:", error);
    throw new Error("Failed to create manual transaction");
  }
};


