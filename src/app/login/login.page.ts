import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';
import { ConfigService } from '../services/config.service';
import { Subscription } from 'rxjs';

export interface DiagnosticData {
  httpStatus: string | number;
  isOnline: boolean;
  invokedUrl: string;
  payloadSent: any;
  headers: Record<string, string>;
  responseOrError: any;
  timestamp: string;
  type: 'idle' | 'loading' | 'success' | 'error';
}

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
export class LoginPage implements OnInit, OnDestroy {
  username = '';
  password = '';
  serverIp = '';
  errorMessage = '';
  isLoading = false;
  isOnline = navigator.onLine;

  // Tarjeta de diagnóstico dinámico
  diagnostic: DiagnosticData = {
    httpStatus: 'En espera',
    isOnline: navigator.onLine,
    invokedUrl: '',
    payloadSent: null,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    responseOrError: null,
    timestamp: '',
    type: 'idle'
  };

  private onlineListener!: () => void;
  private offlineListener!: () => void;
  private configSub!: Subscription;

  constructor(
    private apiService: ApiService,
    private storageService: StorageService,
    private configService: ConfigService,
    private router: Router
  ) {}

  ngOnInit() {
    this.serverIp = this.configService.getCurrentIp();
    this.updateDefaultDiagnosticUrl();

    // Suscribirse a cambios de configuración
    this.configSub = this.configService.config$.subscribe((cfg) => {
      this.serverIp = cfg.ip;
      this.updateDefaultDiagnosticUrl();
    });

    // Monitorear conectividad en tiempo real
    this.onlineListener = () => {
      this.isOnline = true;
      this.diagnostic.isOnline = true;
    };
    this.offlineListener = () => {
      this.isOnline = false;
      this.diagnostic.isOnline = false;
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  ngOnDestroy() {
    if (this.configSub) this.configSub.unsubscribe();
    if (this.onlineListener) window.removeEventListener('online', this.onlineListener);
    if (this.offlineListener) window.removeEventListener('offline', this.offlineListener);
  }

  updateDefaultDiagnosticUrl() {
    this.diagnostic.invokedUrl = `${this.configService.getBaseUrl()}/login.php`;
  }

  /**
   * Actualiza automáticamente la IP en el ConfigService
   */
  onIpChange(newIp: string) {
    this.serverIp = newIp;
    this.configService.updateIp(newIp);
    this.updateDefaultDiagnosticUrl();
  }

  /**
   * Navega a la pantalla completa de Orígenes de Datos
   */
  goToDataSources() {
    this.router.navigate(['/data-sources']);
  }

  /**
   * Diagnóstico rápido: Prueba de conexión sin enviar credenciales
   */
  testConnection() {
    this.diagnostic.type = 'loading';
    this.diagnostic.httpStatus = 'Conectando...';
    this.diagnostic.isOnline = navigator.onLine;
    this.diagnostic.invokedUrl = `${this.configService.getBaseUrl()}/login.php`;
    this.diagnostic.payloadSent = '(Ping GET diagnóstico)';
    this.diagnostic.timestamp = new Date().toLocaleTimeString();
    this.diagnostic.responseOrError = null;

    this.apiService.ping().subscribe({
      next: (res: any) => {
        this.diagnostic.type = 'success';
        this.diagnostic.httpStatus = `${res.status || 200} OK`;
        this.diagnostic.responseOrError = res.body || 'Servidor Apache responde correctamente';
        this.diagnostic.timestamp = new Date().toLocaleTimeString();
      },
      error: (err: any) => {
        this.diagnostic.type = 'error';
        this.diagnostic.httpStatus = err.status === 0
          ? '0 (Falla de Red / Servidor Inaccesible)'
          : `${err.status} ${err.statusText || 'Error'}`;
        this.diagnostic.responseOrError = err.error || err.message || 'No se pudo conectar a XAMPP';
        this.diagnostic.timestamp = new Date().toLocaleTimeString();
      }
    });
  }

  /**
   * Proceso de autenticación con captura completa de diagnóstico
   */
  async onLogin() {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Por favor ingresa usuario y contraseña';
      return;
    }

    const targetUrl = `${this.configService.getBaseUrl()}/login.php`;
    const payload = { username: this.username, password: this.password };

    // Actualizar diagnóstico dinámico antes de disparar la petición
    this.isLoading = true;
    this.diagnostic.type = 'loading';
    this.diagnostic.isOnline = navigator.onLine;
    this.diagnostic.invokedUrl = targetUrl;
    this.diagnostic.payloadSent = {
      username: this.username,
      password: '•'.repeat(this.password.length)
    };
    this.diagnostic.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    this.diagnostic.timestamp = new Date().toLocaleTimeString();
    this.diagnostic.httpStatus = 'Procesando HTTP POST...';

    this.apiService.login(payload).subscribe({
      next: async (res: any) => {
        this.isLoading = false;
        this.diagnostic.timestamp = new Date().toLocaleTimeString();

        if (res.status === 'success') {
          this.diagnostic.type = 'success';
          this.diagnostic.httpStatus = '200 OK (Sesión Válida)';
          this.diagnostic.responseOrError = res;

          // Guardar sesión de usuario de forma persistente en el dispositivo
          await this.storageService.set('currentUser', res.user);
          // Redirigir al tablero Kanban
          this.router.navigate(['/tabs/tab1']);
        } else {
          this.diagnostic.type = 'error';
          this.diagnostic.httpStatus = '200 OK (Credenciales Rechazadas)';
          this.diagnostic.responseOrError = res;
          this.errorMessage = res.message || 'Usuario o contraseña incorrectos';
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error de autenticación:', err);

        this.diagnostic.type = 'error';
        this.diagnostic.httpStatus = err.status === 0
          ? '0 (Falla de Red / Servidor Inaccesible)'
          : `${err.status} ${err.statusText || 'Error de Servidor'}`;
        this.diagnostic.timestamp = new Date().toLocaleTimeString();
        this.diagnostic.responseOrError = err.error || err.message || 'Servidor Apache/MySQL no responde';

        this.errorMessage = err.status === 0
          ? `No se pudo conectar a ${this.serverIp}. Revisa si Apache está activo en XAMPP y en la misma red WiFi.`
          : `Error del servidor HTTP ${err.status}: ${err.message || 'Falla en la respuesta'}`;
      }
    });
  }

  /**
   * Copia los detalles de diagnóstico al portapapeles
   */
  copyDiagnostic() {
    try {
      const data = JSON.stringify({
        ...this.diagnostic,
        serverIp: this.serverIp,
        baseUrl: this.configService.getBaseUrl()
      }, null, 2);
      navigator.clipboard.writeText(data);
    } catch (e) {
      console.warn('Error al copiar diagnóstico', e);
    }
  }
}