import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    // URL base de tu backend en XAMPP
    private baseUrl = 'http://localhost/kanban-api';

    constructor(private http: HttpClient) { }

    // 1. AUTENTICACIÓN / LOGIN
    login(credentials: { username: string; password: string }): Observable<any> {
        return this.http.post(`${this.baseUrl}/login.php`, credentials).pipe(timeout(3000));
    }

    // 2. TAREAS (CRUD)
    getTareas(): Observable<any> {
        return this.http.get(`${this.baseUrl}/tareas.php`).pipe(timeout(3000));
    }

    crearTarea(tarea: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/tareas.php`, tarea).pipe(timeout(3000));
    }

    actualizarTarea(tarea: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/tareas.php`, tarea).pipe(timeout(3000));
    }

    eliminarTarea(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/tareas.php?id=${id}`).pipe(timeout(3000));
    }

    // 3. USUARIOS (CRUD)
    getUsuarios(): Observable<any> {
        return this.http.get(`${this.baseUrl}/usuarios.php`).pipe(timeout(3000));
    }

    crearUsuario(usuario: { username: string; password: string }): Observable<any> {
        return this.http.post(`${this.baseUrl}/usuarios.php`, usuario).pipe(timeout(3000));
    }

    actualizarUsuario(usuario: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/usuarios.php`, usuario).pipe(timeout(3000));
    }

    eliminarUsuario(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/usuarios.php?id=${id}`).pipe(timeout(3000));
    }
}