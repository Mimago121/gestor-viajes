import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { ProfileComponent } from './pages/profile/profile';
import { TripsComponent } from './pages/trips/trips';
import { ItineraryComponent } from './pages/itinerary/itinerary';
import { ExpensesComponent } from './pages/expenses/expenses';
import { MemoriesComponent } from './pages/memories/memories';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'trips', component: TripsComponent },
  { path: 'itinerary', component: ItineraryComponent },
  { path: 'expenses', component: ExpensesComponent },
  { path: 'memories', component: MemoriesComponent },
  { path: '**', redirectTo: 'login' }
];
