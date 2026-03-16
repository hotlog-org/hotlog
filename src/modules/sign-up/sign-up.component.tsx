'use client'

import AuthHeader from '@/modules/auth-shared/auth-header'
import { Link } from '@/i18n/navigation'
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
import { useSignUpService } from './sign-up.service'

const SignUpComponent = () => {
  const service = useSignUpService()

  return (
    <div className='min-h-screen flex items-center justify-center p-4'>
      <AuthHeader />
      <Card className='w-full max-w-lg'>
        <CardHeader>
          <CardTitle>{service.t('title')}</CardTitle>
          <CardDescription>
            {service.t.rich('description', {
              signIn: (chunks) => (
                <Link href='/sign-in' className='underline underline-offset-4'>
                  {chunks}
                </Link>
              ),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <div className='flex items-center gap-2 text-sm text-destructive'>
                  <CircleX size={16} />
                  <span>{service.error}</span>
                </div>
              )}
              {service.success && (
                <div className='flex items-center gap-2 text-sm text-green-600'>
                  <CircleCheck size={16} />
                  <span>{service.t('messages.success')}</span>
                </div>
              )}
              <Button
                type='submit'
                className='w-full'
                disabled={service.isLoading}
              >
                {service.isLoading
                  ? service.t('actions.submitting')
                  : service.t('actions.submit')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default SignUpComponent
