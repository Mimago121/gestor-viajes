import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { 
  Firestore, doc, getDoc, collection, query, where, getDocs, writeBatch 
} from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat-room.html',
  styleUrls: ['./chat-room.css']
})
export class ChatRoomComponent implements OnInit, AfterViewChecked, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentUserId: string = '';
  friendId: string = '';
  friendName: string = 'Cargando...';
  friendAvatar: string = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  
  messages: ChatMessage[] = [];
  newMessage = '';
  roomId = '';
  loading = true;
  
  private chatSubscription: any; // Para cancelar la suscripción al salir

  ngOnInit() {
    this.friendId = this.route.snapshot.paramMap.get('uid') || '';
    
    this.authService.user$.subscribe(async (user) => {
      if (user && this.friendId) {
        this.currentUserId = user.uid;
        await this.loadFriendInfo();

        this.roomId = this.chatService.getChatRoomId(this.currentUserId, this.friendId);
        
        // Suscribirse a los mensajes
        this.chatSubscription = this.chatService.getMessages(this.roomId, (msgs) => {
          this.messages = msgs;
          this.loading = false;
          
          this.cdr.detectChanges(); 
          this.scrollToBottom();

          // INTENTO DE MARCAR COMO LEÍDO CADA VEZ QUE LLEGAN DATOS
          this.markMessagesAsRead();
        });
      }
    });
  }

  ngOnDestroy() {
    // Cuando salimos del chat, dejamos de escuchar
    if (this.chatSubscription) {
      this.chatSubscription();
    }
  }

  async loadFriendInfo() {
    try {
      const docRef = doc(this.firestore, `users/${this.friendId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        this.friendName = data['name'];
        this.friendAvatar = data['avatar'] || this.friendAvatar;
        this.cdr.detectChanges(); 
      }
    } catch (e) { console.error(e); }
  }

  // --- FUNCIÓN CRÍTICA PARA QUITAR NOTIFICACIÓN ---
  async markMessagesAsRead() {
    if (!this.roomId || !this.currentUserId) return;

    try {
      const messagesRef = collection(this.firestore, 'chats', this.roomId, 'messages');
      
      // Buscamos: Mensajes para MÍ + No leídos
      const q = query(
        messagesRef, 
        where('toUid', '==', this.currentUserId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        console.log(`🔎 Encontrados ${snapshot.size} mensajes sin leer. Marcando como leídos...`);
        
        const batch = writeBatch(this.firestore);
        
        snapshot.forEach((doc) => {
          // Actualizamos a true
          batch.update(doc.ref, { read: true });
        });

        await batch.commit();
        console.log("✅ Mensajes marcados como leídos. La burbuja debería desaparecer.");
      } else {
        // Si entra aquí, o no hay mensajes nuevos, O FALTA EL ÍNDICE
        console.log("⚠️ No hay mensajes sin leer o falta el índice en Firebase.");
      }

    } catch (error) {
      console.error("❌ Error al marcar como leído:", error);
    }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    this.chatService.sendMessage(this.roomId, this.newMessage, this.currentUserId, this.friendId);
    this.newMessage = ''; 
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  goBack() {
    this.router.navigate(['/chats']);
  }
}