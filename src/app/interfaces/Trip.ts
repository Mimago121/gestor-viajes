import { MemberMini } from "./MemberMini";

export interface Trip {
  id: string;
  name: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  members: MemberMini[];
  createdAt: number;
}