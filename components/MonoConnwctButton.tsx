import { useState, useCallback } from "react";
import Connect from '@mono.co/connect.j'
import { createBankAccount, exchangeMonoCode, getAccountDetails, initiateMonoLinking, saveMonoAccountId } from "@/lib/actions/user.actions";
import { Button } from "./ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MonoConnectButton({ user, variant }: { user: User, variant?: 'primary' | 'ghost' | 'default' }) {
  const {firstName, lastName, email, $id: docId, phone} = user
  const name = `${firstName} ${lastName}`;
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const router = useRouter();

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
            
            const bank = await createBankAccount({ docId, accessToken: result.data.id, email, firstName, lastName, phone });

            console.log("Bank account created:", bank);

            // Show success toast
            toast.info("Success!",{
              description: "Your bank account has been linked successfully.",
            });
            router.push('/');
            // save account id
            } catch (err) {
              console.error("Exchange failed:", err);

              // Show error toast
              toast.error("Error", {
                description: "Failed to link your bank account. Please try again.",
              });
            }
        },
      });

      monoInstance.setup();
      monoInstance.open(init_code);
  }, [email, name, docId]);

  return (
      <>
      {variant === 'primary' ? (
        <Button
          onClick={() => openMonoWidget()}
          disabled={scriptLoaded}
          className="plaidlink-primary"
        >
          Connect bank
        </Button>
      ): variant === 'ghost' ? (
        <Button onClick={() => openMonoWidget()} variant="ghost" className="plaidlink-ghost">
          <Image 
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='hiddenl text-[16px] font-semibold text-black-2 xl:block'>Connect bank</p>
        </Button>
      ): (
        <Button onClick={() => openMonoWidget()} className="plaidlink-default">
          <Image 
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
           <p className="text-[16px] font-semibold text-black-2 block xl:block md:hidden">Connect bank</p>
        </Button>
      )}
  </>
  );
}