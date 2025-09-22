'use client'

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
    <div className='h-full flex items-center justify-center'>
      <Card className='w-[450px]'>
        <CardHeader>
          <CardTitle>{service.t('title')}</CardTitle>
          <CardDescription>{service.t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...service.form}>
            <form
              onSubmit={service.form.handleSubmit(service.onSubmit)}
              className='space-y-6'
            >
              <div className='space-y-4'>
                <FormField
                  control={service.form.control}
                  name='username'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {service.t('fields.username.label')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={service.t('fields.username.placeholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              <Button type='submit' disabled={service.isLoading}>
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
