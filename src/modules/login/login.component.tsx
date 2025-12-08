'use client'

import AuthHeader from '@/modules/auth-shared/auth-header'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { CircleCheck, CircleX } from 'lucide-react'
import { useLoginService } from './login.service'

const LoginComponent = () => {
  const service = useLoginService()

  return (
    <div className='min-h-screen relative flex items-center justify-center bg-[radial-gradient(80%_60%_at_100%_0%,hsl(var(--foreground)/0.06)_0%,transparent_60%),radial-gradient(60%_50%_at_0%_100%,hsl(var(--foreground)/0.05)_0%,transparent_60%)] p-4'>
      <AuthHeader />
      <Card className='w-full max-w-md border border-border/60 bg-background/70 backdrop-blur-sm shadow-sm transition-all duration-300 group hover:shadow-md hover:ring-1 hover:ring-foreground/10 motion-safe:hover:-translate-y-0.5'>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-2xl font-semibold tracking-tight'>
            {service.t('title')}
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            {service.t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <Form {...service.form}>
            <form
              onSubmit={service.form.handleSubmit(service.onSubmit)}
              className='space-y-5'
            >
              <div className='space-y-4'>
                <FormField
                  control={service.form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{service.t('fields.email.label')}</FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder={service.t('fields.email.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={service.form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {service.t('fields.password.label')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='password'
                          placeholder={service.t('fields.password.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {service.error && (
                <div className='text-sm text-destructive flex gap-1 items-top'>
                  <CircleX size={20} />
                  {service.error}
                </div>
              )}
              {service.success && (
                <div className='text-sm text-green-400 flex gap-1 items-top'>
                  <CircleCheck size={20} />
                  {service.t('messages.success')}
                </div>
              )}
              <Button
                className='w-full transition-all duration-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-foreground/10'
                type='submit'
                disabled={service.isLoading}
              >
                {service.isLoading
                  ? service.t('actions.submitting')
                  : service.t('actions.submit')}
              </Button>
              <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                <div className='h-px flex-1 bg-border' />
                <span>or</span>
                <div className='h-px flex-1 bg-border' />
              </div>
              <Button
                type='button'
                variant='outline'
                className='group w-full transition-all duration-200 hover:bg-muted/60 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-foreground/10'
                onClick={service.handleGoogleSignIn}
                disabled={service.isLoading}
              >
                <span className='mr-2 inline-block h-4 w-4 rounded-sm bg-foreground/60 opacity-80 group-hover:opacity-100 transition-opacity' />
                <span className='transition-transform group-hover:translate-x-0.5'>
                  Continue with Google
                </span>
              </Button>
              <div className='text-right'>
                <a
                  href='/forgot-password'
                  className='text-xs text-muted-foreground hover:text-foreground'
                >
                  Forgot password?
                </a>
              </div>
              <div className='text-center text-sm text-muted-foreground'>
                <span>Don\'t have an account? </span>
                <a
                  href='/sign-up'
                  className='font-medium text-foreground hover:underline underline-offset-4'
                >
                  Sign up
                </a>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginComponent
