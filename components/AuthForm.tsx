'use client'
import Image from 'next/image'
import Link from 'next/link'
import React, { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { set, z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { authFormSchema } from '@/lib/utils'
import CustomInputs from './CustomInputs'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/actions/user.actions'
import MonoConnectButton from './MonoConnwctButton'

interface User {
  firstName?: string;
  lastName?: string;
  email?: string;
  $id?: string;
}

const AuthForm = ({ type }: { type: string }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const formSchema = authFormSchema(type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: type === "sign-in" ? undefined : "",
      lastName: type === "sign-in" ? undefined : "",
      phone: type === "sign-in" ? undefined : "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      if (type === "sign-up") {
        const newUser = await signUp(data);
        setUser(newUser);
        console.log(user);
        
      }

      if (type === "sign-in") {
        const response = await signIn({
          email: data.email,
          password: data.password,
        });

        if (response) router.push("/");
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className='auth-form'>
        <header className='flex flex-col gap-5 md:gap-8'>
            <Link href='/' className='cursor-pointer flex items-center gap-1'>
                <Image
                    src='/icons/logo.svg'
                    alt='Kleva logo'
                    width={34}
                    height={34}
                />
                <h1 className='text-26 font-ibm-plex-serif font-bold text-black-1'>Kleva</h1>
            </Link>
            <div className='flex flex-col gap-1 md:gap-3'>
                <h1 className='text-24 lg:text-36 font-semibold text-grey-900'>
                    {user ? 'Link account' : type === 'sign-in' ? 'sign in' : 'sign-up'}
                    <p className='text-16 font-normal text-grey-60'>
                        {user ? 'Link your account to get started' : 'Please enter your details.'}
                    </p>
                </h1>
            </div>
        </header>
        {user ? (
            <div className='flex flex-col gap-4'>
                <MonoConnectButton name={`${user?.firstName} ${user?.lastName}`} email={user?.email!} docId={user?.$id!} />
            </div>
        )
        :
        (
            <>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {type === 'sign-up' && (
                            <>  
                                <div className='flex justify-between gap-4'>
                                    <CustomInputs control={form.control} name="firstName" label="First Name" placeholder="Enter your first name"/>
                                    <CustomInputs control={form.control} name="lastName" label="Last Name" placeholder="Enter your last name"/>
                                </div>
                                <CustomInputs control={form.control} name="phone" label="Phone" placeholder="Enter your phone number eg (+1234567890)"/>
                            </>
                        )}
                        <CustomInputs control={form.control} name="email" label="Email" placeholder="Enter your email"/>
                        <CustomInputs control={form.control} name="password" label="Password" placeholder="Enter your password"/>
                        <div className='flex flex-col gap-4'>
                            <Button type="submit" disabled={isLoading} className='form-btn'>
                                {isLoading ? (
                                    <>
                                        <Loader2 className='animate-spin' /> &nbsp; Loading...
                                    </>
                                ) : (
                                    type === 'sign-in' ? 'Sign In' : 'Sign Up'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>

                <footer className='flex justify-center gap-1'>
                    <p className='text-14 font-normal text-gray-600'>
                        {type === 'sign-in' ? "Don't have an account?" : "Already have an account?"}
                    </p>
                    <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className='form-link'>
                        {type === 'sign-in' ? 'Sign Up' : 'Sign In'}
                    </Link>
                </footer>
            </>
        )
    }
    </section>
  )
}

export default AuthForm