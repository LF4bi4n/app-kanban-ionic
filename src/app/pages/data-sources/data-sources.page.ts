import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { ConfigService, ServerConfig, DEFAULT_CONFIG } from '../../services/config.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-data-sources',
  templateUrl: './data-sources.page.html',
  styleUrls: ['./data-sources.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DataSourcesPage implements OnInit {
  config: ServerConfig = { ...DEFAULT_CONFIG };
  isOnline: boolean = navigator.onLine;

  // Estado del test de conexión
  isTesting = false;
  testResult: {
    success: boolean;
    status: number | string;
    message: string;
    latencyMs?: number;
    timestamp: string;
    details?: any;
  } | null = null;

  // Presets rápidos para desarrollo
  presets = [
    { label: 'WiFi Local (192.168.100.7)', ip: '192.168.100.7', port: 80, mysql: 3304 },
    { label: 'Emulador Android (10.0.2.2)', ip: '10.0.2.2', port: 80, mysql: 3304 },
    { label: 'Localhost Web (127.0.0.1)', ip: '127.0.0.1', port: 80, mysql: 3306 },
    { label: 'Puerto Apache 8080', ip: '192.168.100.7', port: 8080, mysql: 3304 }
  ];

  constructor(
    private configService: ConfigService,
    private apiService: ApiService,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCurrentConfig();
    window.addEventListener('online', () => (this.isOnline = true));
    window.addEventListener('offline', () => (this.isOnline = false));
  }

  loadCurrentConfig() {
    this.config = { ...this.configService.getConfig() };
  }

  get computedBaseUrl(): string {
    const protocol = this.config.protocol || 'http';
    const ip = (this.config.ip || '').trim();
    const port = Number(this.config.apachePort);
    const cleanPath = (this.config.apiPath || 'kanban-api').replace(/^\/+|\/+$/g, '');
    const portString = port && port !== 80 && port !== 443 ? `:${port}` : '';
    return `${protocol}://${ip}${portString}/${cleanPath}`;
  }

  get jsonPreview(): string {
    return JSON.stringify(
      {
        ip: this.config.ip,
        apachePort: Number(this.config.apachePort),
        mysqlPort: Number(this.config.mysqlPort),
        protocol: this.config.protocol,
        apiPath: this.config.apiPath,
        computedBaseUrl: this.computedBaseUrl,
        updatedAt: this.config.updatedAt || new Date().toISOString()
      },
      null,
      2
    );
  }

  applyPreset(preset: { ip: string; port: number; mysql: number }) {
    this.config.ip = preset.ip;
    this.config.apachePort = preset.port;
    this.config.mysqlPort = preset.mysql;
    this.showToast(`Preset aplicado: ${preset.ip}`, 'primary');
  }

  async saveConfig() {
    if (!this.config.ip || !this.config.ip.trim()) {
      this.showAlert('IP Inválida', 'Por favor ingresa una dirección IP válida (ej. 192.168.100.7 o 10.0.2.2).');
      return;
    }

    this.configService.saveConfig(this.config);
    await this.showToast('Configuración guardada correctamente en localStorage', 'success');
  }

  async resetDefaults() {
    const alert = await this.alertController.create({
      header: 'Restablecer Valores',
      message: '¿Deseas restaurar la configuración a los valores iniciales (192.168.100.7, Puerto 80, MySQL 3304)?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Restablecer',
          handler: () => {
            this.config = { ...this.configService.resetToDefaults() };
            this.testResult = null;
            this.showToast('Valores restaurados por defecto', 'medium');
          }
        }
      ]
    });
    await alert.present();
  }

  testConnection() {
    this.isTesting = true;
    this.testResult = null;
    const startTime = performance.now();

    // Guardar temporalmente para que ApiService use los valores actuales
    this.configService.saveConfig(this.config);

    this.apiService.ping().subscribe({
      next: (res: any) => {
        const latency = Math.round(performance.now() - startTime);
        this.isTesting = false;
        this.testResult = {
          success: true,
          status: res.status || 200,
          message: '¡Conexión establecida con éxito con el backend XAMPP!',
          latencyMs: latency,
          timestamp: new Date().toLocaleTimeString(),
          details: res.body || 'Respuesta HTTP 200 OK'
        };
        this.showToast(`Conectado (${latency}ms)`, 'success');
      },
      error: (err: any) => {
        const latency = Math.round(performance.now() - startTime);
        this.isTesting = false;
        let msg = 'No se pudo conectar con el servidor XAMPP.';

        if (err.status === 0) {
          msg = `Error de Red (HTTP 0): Apache inaccesible en ${this.computedBaseUrl}. Verifica si Apache está iniciado en XAMPP y el firewall de Windows.`;
        } else if (err.status === 404) {
          msg = `Ruta no encontrada (HTTP 404): Verifica que la carpeta '${this.config.apiPath}' exista dentro de xampp/htdocs/.`;
        } else {
          msg = `HTTP ${err.status}: ${err.message || 'Error del servidor'}`;
        }

        this.testResult = {
          success: false,
          status: err.status || 0,
          message: msg,
          latencyMs: latency,
          timestamp: new Date().toLocaleTimeString(),
          details: err.error || err.statusText || 'ERR_CONNECTION_REFUSED'
        };
        this.showToast(`Falla de conexión (HTTP ${err.status})`, 'danger');
      }
    });
  }

  copyJson() {
    try {
      navigator.clipboard.writeText(this.jsonPreview);
      this.showToast('JSON de configuración copiado al portapapeles', 'tertiary');
    } catch {
      this.showToast('No se pudo copiar automáticamente', 'warning');
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToBoard() {
    this.router.navigate(['/tabs/tab1']);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' | 'medium' | 'tertiary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['Aceptar']
    });
    await alert.present();
  }
}
