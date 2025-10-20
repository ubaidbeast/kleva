"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// import { createTransfer } from "@/lib/actions/dwolla.actions";
// import { createTransaction } from "@/lib/actions/transaction.actions";
import { createManualTransaction, getBank, getBankByAccountId } from "@/lib/actions/user.actions";
import { decryptId } from "@/lib/utils";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import Image from "next/image";
import { CategoryBadge } from "./TransactionsTable";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(4, "Amount is too short"),
  senderBank: z.string().min(2, "Please select a valid bank account"),
  type: z.string().min(4, "Please select a valid transfer type"),
  category: z.string().min(2, "Please select a valid transfer category"),
});

const PaymentTransferForm = ({ accounts, userId }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: "",
      senderBank: "",
      type: "credit",
      category: "",
    },
  });

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {

      const senderBank = await getBank({ documentId: data.senderBank });

      const transactionData = {
        name: data.name,
        amount: parseFloat(data.amount),
        type: data.type,
        category: data.category,
        bankId: senderBank?.$id!,
        userId,
      };

      const newTransaction = await createManualTransaction(transactionData);

        if (newTransaction) {
          form.reset();
          router.push("/");
          toast.info("Transfer Successful", {
            description: "Your transfer has been created successfully.",
          });
        }
    } catch (error) {
      console.error("Submitting create transfer request failed: ", error);
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">
        <FormField
          control={form.control}
          name="senderBank"
          render={() => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Select Source Bank
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Select the bank account you want to transfer funds from
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <BankDropdown
                      accounts={accounts}
                      setValue={form.setValue}
                      otherStyles="!w-full"
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_form-details">
          <h2 className="text-18 font-semibold text-gray-900">
            Transfer details
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Enter the details of the transfer
          </p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Recipient&apos;s Name
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: John Doe"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={() => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Select Transfer type
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Select the type of transfer you want to make
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Select defaultValue="credit" onValueChange={(value) => form.setValue("type", value)}>
                      <SelectTrigger
                        className={`flex w-full bg-white gap-3 md:w-[300px]`}
                      >
                        <Image
                          src="icons/payment.svg"
                          width={20}
                          height={20}
                          alt="account"
                        />
                        <SelectValue placeholder="Select transfer type" />
                      </SelectTrigger>
                      <SelectContent
                        className={`w-full bg-white md:w-[300px]`}
                        align="end"
                      >
                        <SelectGroup>
                          <SelectLabel className="py-2 font-normal text-gray-500">
                            Select credit or debit
                          </SelectLabel>
                          <SelectItem
                            value="credit"
                            className="cursor-pointer border-t"
                          >
                            <div className="flex gap-2">
                              <Image
                                src="icons/credit-card-arrow.svg"
                                width={20}
                                height={20}
                                alt="account"
                                className="text-red-500"
                              />
                              <p className="text-16 font-medium text-red-500">-Credit</p>
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="debit"
                            className="cursor-pointer border-t"
                          >
                            <div className="flex gap-2">
                              <Image
                                src="icons/credit-payment.svg"
                                width={20}
                                height={20}
                                alt="account"
                                className="text-green-500"
                              />
                              <p className="text-16 font-medium text-green-500">+Debit</p>
                            </div>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={() => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Select the Transfer category
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Select the category of the transfer you are making
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Select onValueChange={(value) => form.setValue("category", value)}>
                      <SelectTrigger
                        className={`flex w-full bg-white gap-3 md:w-[300px]`}
                      >
                        <SelectValue placeholder="Select transfer category" />
                      </SelectTrigger>
                      <SelectContent
                        className={`w-full bg-white md:w-[300px]`}
                        align="end"
                      >
                        <SelectGroup>
                          <SelectLabel className="py-2 font-normal text-gray-500">
                            Select category
                          </SelectLabel>
                          <SelectItem
                            value="Food and Drink"
                            className="cursor-pointer border-t flex w-full"
                          >
                            <CategoryBadge category="Food and Drink"/>
                          </SelectItem>
                          <SelectItem
                            value="Payment"
                            className="cursor-pointer border-t"
                          >
                            <CategoryBadge category="Payment"/>
                          </SelectItem>
                          <SelectItem
                            value="Transfer"
                            className="cursor-pointer border-t"
                          >
                            <CategoryBadge category="Transfer"/>
                          </SelectItem>
                          <SelectItem
                            value="other"
                            className="cursor-pointer border-t"
                          >
                            <CategoryBadge category="Other"/>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="border-y border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Amount
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: 5.00"
                      className="input-class"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_btn-box">
          <Button type="submit" className="payment-transfer_btn">
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> &nbsp; Sending...
              </>
            ) : (
              "Transfer Funds"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentTransferForm;