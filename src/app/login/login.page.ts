import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginPage {
  username = '';
  password = '';
  errorMessage = '';

  constructor(
    private apiService: ApiService,
    private storageService: StorageService,
    private router: Router
  ) { }

  async onLogin() {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Por favor ingresa usuario y contraseña';
      return;
    }

    this.apiService.login({ username: this.username, password: this.password }).subscribe({
      next: async (res: any) => {
        if (res.status === 'success') {
          // Guardar sesión de usuario de forma persistente en el dispositivo
          await this.storageService.set('currentUser', res.user);
          // Redirigir al tablero Kanban
          this.router.navigate(['/tabs/tab1']);
        } else {
          this.errorMessage = res.message;
        }
      },
      error: (err) => {
        console.error('Error de autenticación:', err);
        this.errorMessage = 'No se pudo conectar con el servidor XAMPP. Revisa si Apache está activo.';
      }
    });
  }
}