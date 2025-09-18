'use server'

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";
import { get } from "http";
import { access } from "fs";
import { create } from "domain";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const signIn = async ({ email, password }:  signInProps) => {
    try {
        const { account } = await createAdminClient();
        const response = await account.createEmailPasswordSession({
            email,
            password
        });

        (await cookies()).set("appwrite-session", response.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });


        return parseStringify(response);
    } catch (error) {
        console.log('Error', error);
    }
}

export const signUp = async (userData: SignUpParams) => {
    let newUserAccount;

    const { firstName, lastName, email, password} = userData;
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
              monoCustomerId: "",
          }
        );

        if(!newUser) throw new Error('Error creating user document');

        const session = await account.createEmailPasswordSession({
            email,
            password
        });

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

export const saveMonoAccountId = async (docId: string, accountId: string) => {
  try {
    const { database } = await createAdminClient();

    // Debugging: Log the inputs
    console.log("Updating document with docId:", docId);
    console.log("DATABASE_ID:", DATABASE_ID);
    console.log("USER_COLLECTION_ID:", USER_COLLECTION_ID);

    // Check if the document exists
    const existingDocument = await database.getDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      docId
    );
    console.log("Existing document:", existingDocument);

    // Update the document
    const updatedUser = await database.updateDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      docId,
      { monoCustomerId: accountId }
    );

    return updatedUser;
  } catch (err) {
    console.error("Error saving Mono customer ID:", err);
    throw err;
  }
};

// ... your initilization functions

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

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

export const createBankAccount = async ({
    userId,
    bankId,
    accountId,
}: createBankAccountProps) => {
    try {
        const { database } = await createAdminClient();

        const bankAccount = await database.createDocument(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            ID.unique(),
            {
                userId,
                bankId,
                accountId,
            }
        )

        return parseStringify(bankAccount);
    } catch (error) {
        
    }
}

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