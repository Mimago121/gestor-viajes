export interface MemberMini {
  id: string;
  name: string;
  avatarUrl?: string | null;
  status?: 'pending' | 'accepted';
}