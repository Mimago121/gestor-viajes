import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { ProfileComponent } from './pages/profile/profile';
import { TripsComponent } from './pages/trips/trips';
import { ItineraryComponent } from './pages/itinerary/itinerary';
import { ExpensesComponent } from './pages/expenses/expenses';
import { MemoriesComponent } from './pages/memories/memories';
import { RegisterComponent } from './pages/register/register';
import { FriendsComponent } from './pages/friends/friends';
import { ChatsComponent } from './pages/chats/chats';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard';
import { ChatRoomComponent } from './pages/chat-room/chat-room';
import { adminGuard } from './guards/admin.guard';
import { TripDetailComponent } from './pages/trip-detail/trip-detail';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'trips', component: TripsComponent },
  { path: 'itinerary', component: ItineraryComponent },
  { path: 'register', component: RegisterComponent }, // <--- NUEVA RUTA
  { path: 'expenses', component: ExpensesComponent },
  { path: 'memories', component: MemoriesComponent },
  { path: 'chats', component: ChatsComponent },
  { path: 'chat/:uid', component: ChatRoomComponent },
  { path: 'trips/:id', component: TripDetailComponent },
  { path: 'friends', component: FriendsComponent },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: 'login' },
];
