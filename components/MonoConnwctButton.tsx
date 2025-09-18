    import { useState, useCallback } from "react";
    import Connect from '@mono.co/connect.j'
    import { exchangeMonoCode, getAccountDetails, initiateMonoLinking, saveMonoAccountId } from "@/lib/actions/user.actions";
    import { redirect } from "next/dist/server/api-utils";

    export default function MonoConnectButton({ name, email, docId }: {name: string, email: string, docId: string}) {
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [accountDetails, setAccountDetails] = useState<any>(null);

    const openMonoWidget = useCallback(async () => {
        const MonoConnect = (await import("@mono.co/connect.js")).default;
        const { init_code } = await initiateMonoLinking(name, email);
        
        const monoInstance = new MonoConnect({
          key: "test_pk_f2psjofae83hpf8yepwq",
          onClose: () => console.log("Widget closed"),
          onLoad: () => setScriptLoaded(true),
          onSuccess: async ({ code } : {code: string}) => {
              console.log(`Linked successfully: ${code}`)

              try {
              const result = await exchangeMonoCode(code);
              console.log("Server result:", result);
              setAccountId(result.data.id);
              await saveMonoAccountId(docId, accountId!);
              // save account id
              } catch (err) {
              console.error("Exchange failed:", err);
              }
          },
        });

        monoInstance.setup();
        monoInstance.open(init_code);
    }, [email, name]);

    const fetchDetails = async () => {
    if (!accountId) return;
    try {
      const details = await getAccountDetails(accountId); // server action
      setAccountDetails(details);
      console.log("Account details:", details);
    } catch (err) {
      console.error("Failed to fetch account details:", err);
    }
  };

    return (
        <div>
            <button onClick={openMonoWidget}>Link a financial account</button>
            {accountId && (
                <>
                <p>Linked account ID: {accountId}</p>
                <p>Account Name: {name}</p>
                <p>Account Email: {email}</p>
                <p>Document ID: {docId}</p>
                <button onClick={fetchDetails}>Get Account Details</button>
                </>
            )}
            {accountDetails && (
                <pre>{JSON.stringify(accountDetails, null, 2)}</pre>
            )}
    </div>
    );
    }