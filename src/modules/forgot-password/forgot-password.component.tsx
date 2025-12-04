'use client'

import AuthHeader from '@/modules/auth-shared/auth-header'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { CircleCheck, CircleX, Mail } from 'lucide-react'
import { useForgotPasswordService } from './forgot-password.service'

const ForgotPasswordComponent = () => {
  const service = useForgotPasswordService()

  return (
    <div className='min-h-screen relative flex items-center justify-center bg-[radial-gradient(80%_60%_at_100%_0%,hsl(var(--foreground)/0.06)_0%,transparent_60%),radial-gradient(60%_50%_at_0%_100%,hsl(var(--foreground)/0.05)_0%,transparent_60%)] p-4'>
      <AuthHeader />
      <Card className='w-full max-w-md border shadow-sm'>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-2xl font-semibold tracking-tight'>Forgot password</CardTitle>
          <CardDescription className='text-muted-foreground'>Enter your email to receive a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...service.form}>
            <form onSubmit={service.form.handleSubmit(service.onSubmit)} className='space-y-5'>
              <FormField
                control={service.form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Mail className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
                        <Input type='email' className='pl-9' placeholder='you@example.com' {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {service.error && (
                <div className='text-sm text-destructive flex gap-1 items-top'>
                  <CircleX size={18} />
                  {service.error}
                </div>
              )}
              {service.success && (
                <div className='text-sm text-green-600 flex gap-1 items-top'>
                  <CircleCheck size={18} />
                  Check your inbox for the reset link.
                </div>
              )}
              <Button type='submit' className='w-full' disabled={service.isLoading}>
                {service.isLoading ? 'Sending…' : 'Send reset link'}
              </Button>
              <div className='text-center text-sm text-muted-foreground'>
                <a href='/sign-in' className='hover:underline underline-offset-4'>Back to sign in</a>
                <span className='px-2'>·</span>
                <a href='/sign-up' className='hover:underline underline-offset-4'>Create account</a>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPasswordComponent


