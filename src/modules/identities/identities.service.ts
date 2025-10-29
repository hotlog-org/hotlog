export interface IGroup {
  id: string;
  name: string;
  description?: string;
  members: IMember[];
  createdAt: Date;
}

export interface IMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer' | string;
  avatar?: string;
}

export const getGroups = async (): Promise<IGroup[]> => {
  // mock data — replace with real API call
  return [
    {
      id: 'dev',
      name: 'Development Team',
      description: 'Core engineers working on features and platform.',
      createdAt: new Date('2024-02-14'),
      members: [
        { id: 'm1', name: 'Alice Morgan', email: 'alice@example.com', role: 'admin', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=alice' },
        { id: 'm2', name: 'Ben Carter', email: 'ben@example.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=ben' },
        { id: 'm3', name: 'Chris Lee', email: 'chris@example.com', role: 'viewer', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=chris' },
      ],
    },
    {
      id: 'testing',
      name: 'Testing Team',
      description: 'QA engineers and automation specialists.',
      createdAt: new Date('2023-08-01'),
      members: [
        { id: 'm4', name: 'Dana White', email: 'dana@example.com', role: 'admin', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=dana' },
        { id: 'm5', name: 'Evan Green', email: 'evan@example.com', role: 'user', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=evan' },
      ],
    },
    {
      id: 'management',
      name: 'Management Team',
      description: 'Product and business leads.',
      createdAt: new Date('2022-11-10'),
      members: [
        { id: 'm6', name: 'Fiona Zhang', email: 'fiona@example.com', role: 'admin', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=fiona' },
        { id: 'm7', name: 'George King', email: 'george@example.com', role: 'viewer', avatar: 'https://api.dicebear.com/7.x/thumbs/svg?seed=george' },
      ],
    },
  ]
};