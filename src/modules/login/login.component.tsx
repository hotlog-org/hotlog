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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { useLoginService } from './login.service'

const LoginComponent = () => {
  const service = useLoginService()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{service.t('title')}</CardTitle>
        <CardDescription>{service.t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...service.form}>
          <form
            onSubmit={service.form.handleSubmit(service.onSubmit)}
            className='space-y-8'
          >
            {service.error && (
              <div className='text-sm text-red-600 bg-red-50 p-3 rounded-md'>
                {service.error}
              </div>
            )}
            {service.success && (
              <div className='text-sm text-green-600 bg-green-50 p-3 rounded-md'>
                {service.t('messages.success')}
              </div>
            )}
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
                  <FormDescription>
                    {service.t('fields.email.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={service.form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{service.t('fields.password.label')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={service.t('fields.password.placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {service.t('fields.password.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' disabled={service.isLoading}>
              {service.isLoading
                ? service.t('actions.submitting')
                : service.t('actions.submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default LoginComponent
