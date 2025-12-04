import { Button } from '@/shared/ui/button'

export function EventsExtraComponent() {
  return (
    <div className='inline-flex gap-4'>
      <Button variant='secondary'>Filter by name</Button>
      <Button variant='secondary'>Filter by name</Button>
      <Button variant='secondary'>Filter by name</Button>
      <Button variant='destructive'>Filter by name</Button>
    </div>
  )
}
