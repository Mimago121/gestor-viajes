import { MemberMini } from "./MemberMini.js";



export interface Trip {
  id: string;
  name: string;
  origin: string;
  destination: string;
  startDate: string; // ISO string yyyy-mm-dd (lo devuelve input type="date")
  endDate: string;   // ISO string yyyy-mm-dd
  imageUrl?: string;
  members: MemberMini[];
  createdAt: number;
}