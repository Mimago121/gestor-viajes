import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core'; // <--- AÑADIR ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat-room.html',
  styleUrls: ['./chat-room.css']
})
export class ChatRoomComponent implements OnInit, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // <--- INYECTAR

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentUserId: string = '';
  friendId: string = '';
  friendName: string = 'Cargando...';
  friendAvatar: string = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  
  messages: ChatMessage[] = [];
  newMessage = '';
  roomId = '';
  loading = true;

  ngOnInit() {
    this.friendId = this.route.snapshot.paramMap.get('uid') || '';
    
    this.authService.user$.subscribe(async (user) => {
      if (user && this.friendId) {
        this.currentUserId = user.uid;
        await this.loadFriendInfo();

        this.roomId = this.chatService.getChatRoomId(this.currentUserId, this.friendId);
        
        // Suscribirse a los mensajes
        this.chatService.getMessages(this.roomId, (msgs) => {
          this.messages = msgs;
          this.loading = false;
          
          this.cdr.detectChanges(); // <--- FORZAR QUE APAREZCAN LOS MENSAJES
          this.scrollToBottom();
        });
      }
    });
  }

  async loadFriendInfo() {
    try {
      const docRef = doc(this.firestore, `users/${this.friendId}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        this.friendName = data['name'];
        this.friendAvatar = data['avatar'] || this.friendAvatar;
        this.cdr.detectChanges(); // <--- Actualizar header
      }
    } catch (e) { console.error(e); }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    this.chatService.sendMessage(this.roomId, this.newMessage, this.currentUserId);
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