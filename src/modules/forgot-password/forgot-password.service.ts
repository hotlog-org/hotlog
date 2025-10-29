import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'

export const useForgotPasswordService = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = z.object({
    email: z.string().email('Please enter a valid email'),
  })

  type Inputs = z.infer<typeof schema>

  const form = useForm<Inputs>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: Inputs) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)
    try {
      // TODO: Wire to backend password reset endpoint via auth client or custom API
      await new Promise((resolve) => setTimeout(resolve, 800))
      setSuccess(true)
      form.reset()
    } catch {
      setError('Failed to send reset link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return { form, onSubmit, isLoading, success, error }
}


