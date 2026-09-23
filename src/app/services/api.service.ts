import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    // URL base de tu backend en XAMPP
    private baseUrl = 'http://localhost/kanban-api';

    constructor(private http: HttpClient) { }

    // ==========================================
    // 1. AUTENTICACIÓN / LOGIN
    // ==========================================
    login(credentials: { username: string; password: string }): Observable<any> {
        return this.http.post(`${this.baseUrl}/login.php`, credentials);
    }

    // ==========================================
    // 2. TAREAS (CRUD)
    // ==========================================
    getTareas(): Observable<any> {
        return this.http.get(`${this.baseUrl}/tareas.php`);
    }

    crearTarea(tarea: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/tareas.php`, tarea);
    }

    actualizarTarea(tarea: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/tareas.php`, tarea);
    }

    eliminarTarea(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/tareas.php?id=${id}`);
    }

    // ==========================================
    // 3. USUARIOS (CRUD)
    // ==========================================
    getUsuarios(): Observable<any> {
        return this.http.get(`${this.baseUrl}/usuarios.php`);
    }

    crearUsuario(usuario: { username: string; password: string }): Observable<any> {
        return this.http.post(`${this.baseUrl}/usuarios.php`, usuario);
    }

    actualizarUsuario(usuario: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/usuarios.php`, usuario);
    }

    eliminarUsuario(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/usuarios.php?id=${id}`);
    }
}