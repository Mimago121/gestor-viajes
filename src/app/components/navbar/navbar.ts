import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <--- Importar ChangeDetectorRef
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';
import { 
  Firestore, doc, getDoc, collectionGroup, query, where, onSnapshot 
} from '@angular/fire/firestore'; // <--- Importar collectionGroup

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // <--- Inyectar detector

  currentUser: User | null = null;
  userAvatar: string = 'assets/logo.png'; // Avatar por defecto o logo
  isMenuCollapsed = true;
  
  // Variable para el contador
  unreadCount: number = 0;

  ngOnInit() {
    this.authService.user$.subscribe(async (user) => {
      this.currentUser = user;
      if (user) {
        // Cargar avatar
        const snap = await getDoc(doc(this.firestore, `users/${user.uid}`));
        if (snap.exists()) {
          this.userAvatar = snap.data()['avatar'] || this.userAvatar;
        }

        // --- ESCUCHAR NOTIFICACIONES (Mensajes no leídos) ---
        this.listenToUnreadMessages(user.uid);
      }
    });
  }

  listenToUnreadMessages(uid: string) {
    // Buscamos en TODAS las colecciones 'messages'
    // Mensajes donde: el destinatario soy YO y 'read' es falso
    const q = query(
      collectionGroup(this.firestore, 'messages'),
      where('toUid', '==', uid),
      where('read', '==', false)
    );

    onSnapshot(q, (snapshot) => {
      this.unreadCount = snapshot.size; // El número de documentos encontrados
      console.log("Mensajes sin leer:", this.unreadCount);
      this.cdr.detectChanges(); // Actualizar la vista
    }, (error) => {
      console.error("Error en notificaciones:", error);
    });
  }

  toggleMenu() { this.isMenuCollapsed = !this.isMenuCollapsed; }
  closeMenu() { this.isMenuCollapsed = true; }

  async logout() {
    await this.authService.logout();
    this.closeMenu();
    this.router.navigate(['/login']);
  }
}