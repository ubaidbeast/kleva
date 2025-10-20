"use server"

import { parseStringify } from "../utils";
import { getAccountDetails, getBank, getBanks, getTransactionsByBankId } from "./user.actions";

export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    if (!userId) return null;
    // Ensure userId is valid
    if (!userId) {
      throw new Error("Invalid userId. User must be logged in to fetch accounts.");
    }

    // Get banks from the database
    const banks = await getBanks({ userId });

    if (!banks || banks.length === 0) {
      return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0 });
    }

    const accounts = await Promise.all(
      banks.map(async (bank: Bank) => {
        if (bank.accesstoken != "none") {

          // Get each account's details from Mono API
          const accountsResponse = await getAccountDetails(bank.accesstoken);
  
          // Map the first account in the data array
          const accountData = accountsResponse.data;
  
          console.log("Account data from Mono API:", accountData); // Debugging
          
  
          // Validate the account data
          if (!accountData || !accountData.account.institution) {
            throw new Error("Missing account or institution details in Mono API response");
          }
  
          // Construct the account object
          const account = {
            id: accountData.account.id,
            balance: accountData.account.balance,
            institutionId: accountData.account.institution.bank_code,
            name: accountData.account.institution.name,
            officialName: accountData.account.name,
            mask: accountData.account.account_number,
            type: accountData.account.type,
            subtype: accountData.account.institution.type,
            appwriteItemId: bank.$id,
          };
  
          return account;
        } else {
          // Fetch all manual transactions for this bank
          const manualTransactions = await getTransactionsByBankId({
            bankId: bank.$id,
          });

          const totalManualBalance = manualTransactions.documents.reduce(
            (sum: number, tx: any) => sum + (tx.amount || 0),
            0
          );

          return {
            id: bank.$id,
            balance: totalManualBalance,
            institutionId: "manual",
            name: "Cash Account",
            officialName: "Manual Account",
            mask: "0000",
            type: "manual",
            subtype: "cash",
            appwriteItemId: bank.$id,
          };
        }
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.balance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

//Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    // get bank from db
    const bank = await getBank({ documentId: appwriteItemId });
    console.log('this is the bank', bank);

     // 🟢 If the bank is manual (Cash)
    if (bank.bankId === "manual-cash") {
      // Fetch its transactions directly from Appwrite
      const transferTransactionsData = await getTransactionsByBankId({
        bankId: bank.$id,
      });

      const transferTransactions = transferTransactionsData.documents.map(
        (t: Transaction) => ({
          id: t.$id,
          name: t.name!,
          amount: t.amount!,
          accountId: t.accountId,
          date: t.$createdAt,
          category: t.category || "General",
          type: t.type || "manual",
        })
      );

      // Construct a pseudo-account object
      const account = {
        id: bank.accountId,
        balance: bank.balance || 0,
        institutionId: "manual",
        name: "Cash",
        officialName: "Manual Cash Account",
        mask: "0000",
        type: "manual",
        subtype: "wallet",
        appwriteItemId: bank.$id,
      };

      // Sort and return
      const allTransactions = [...transferTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return parseStringify({
        data: account,
        transactions: allTransactions,
      });
    }
    

    // get account info from mono
    const accountsResponse = await getAccountDetails(bank.accesstoken);
    console.log('response',  accountsResponse.data.customer.id);
    
    const accountData = accountsResponse.data;

    const transactions = await getTransactions({
      accessToken: bank?.accesstoken, account_id: accountsResponse.data.customer.id
    });

    // Construct the account object
    const account = {
      id: accountData.account.id,
      balance: accountData.account.balance,
      institutionId: accountData.account.institution.bank_code,
      name: accountData.account.institution.name,
      officialName: accountData.account.name,
      mask: accountData.account.account_number,
      type: accountData.account.type,
      subtype: accountData.account.institution.type,
      appwriteItemId: bank.$id,
    };

    //sort transactions by date such that the most recent transaction is first
      const allTransactions = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
  }
};

export const getTransactions = async ({
  accessToken,
  account_id,
}: getTransactionsProps) => {
  let transactions: any[] = [];
  let nextUrl: string | null = `https://api.withmono.com/v2/accounts/${accessToken}/transactions`;

  try {
    do {
      const response = await fetch(nextUrl, {
        method: "GET",
        headers: {
          "mono-sec-key": process.env.MONO_SECRET_KEY!,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Mono API error: ${response.status}`);
      }

      const data:any = await response.json();
      console.log("Fetched page:", data.meta?.page);

      // Map transactions
      const pageTransactions = data.data.map((transaction: any) => ({
        id: transaction.id,
        name: transaction.narration,
        type: transaction.type,
        accountId: account_id,
        amount: transaction.amount,
        category: transaction.category ? transaction.category : "Other",
        date: transaction.date,
        image: transaction.logo_url || null,
      }));

      transactions = [...transactions, ...pageTransactions];

      // Update nextUrl for pagination
      nextUrl = data.meta?.next || null;
    } while (nextUrl);

    return transactions;
  } catch (error) {
    console.error("An error occurred while getting transactions:", error);
    throw error;
  }
};
