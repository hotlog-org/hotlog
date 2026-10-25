'use client'

import { ERoutes } from '@/config/routes'
import { Link } from '@/i18n/navigation'
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
import { useResetPasswordService } from './reset-password.service'

export default function ResetPasswordComponent() {
  const service = useResetPasswordService()

  return (
    <div className='min-h-screen flex items-center justify-center p-4'>
      <AuthHeader />
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>{service.t('title')}</CardTitle>
          <CardDescription>{service.t('description')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {service.isChecking && <p role='status'>{service.t('checking')}</p>}
          {service.error && (
            <p role='alert' className='text-sm text-destructive'>
              {service.error}
            </p>
          )}
          {service.passwordUpdated ? (
            <div className='space-y-4'>
              <p role='status'>{service.t('updated')}</p>
              <Button
                disabled={service.isLoading}
                onClick={service.retrySignOut}
              >
                {service.t('signIn')}
              </Button>
            </div>
          ) : (
            service.hasSession && (
              <Form {...service.form}>
                <form
                  onSubmit={service.form.handleSubmit(service.onSubmit)}
                  className='space-y-4'
                >
                  {(['password', 'confirmation'] as const).map((name) => (
                    <FormField
                      key={name}
                      control={service.form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{service.t(name)}</FormLabel>
                          <FormControl>
                            <Input
                              type='password'
                              autoComplete='new-password'
                              disabled={service.isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type='submit'
                    disabled={service.isLoading}
                    className='w-full'
                  >
                    {service.isLoading
                      ? service.t('saving')
                      : service.t('submit')}
                  </Button>
                </form>
              </Form>
            )
          )}
          {!service.passwordUpdated && (
            <div className='flex justify-between text-sm'>
              <Link href={ERoutes.FORGOT_PASSWORD}>
                {service.t('requestLink')}
              </Link>
              <Link href={ERoutes.SIGN_IN}>{service.t('signIn')}</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
