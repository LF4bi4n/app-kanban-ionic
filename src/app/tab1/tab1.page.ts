import { Component, OnInit, AfterViewInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';

declare var bootstrap: any;

class Task {
  id: number;
  title: string;
  details: string;
  summary: string;
  column: string;
  dueDate: string;
  createdDate: string;
  priority: { level: string; value: number };
  parent: { id: number | null; title: string };
  assignee: { id: number | null; name: string };
  tags: string[];
  status: string;
  createdBy: string;
  project: { id?: number; name: string };

  constructor(data: any = {}) {
    this.id = parseInt(data.id) || 0;
    this.title = data.title || "";
    this.details = data.details || "";
    this.summary = data.summary || "";
    this.column = data.columna || data.column || "todo-column";
    this.dueDate = data.due_date || data.dueDate || "";
    this.createdDate = data.created_at || data.createdDate || new Date().toISOString();
    this.priority = {
      level: data.priority_level || data.priority?.level || "Low",
      value: parseInt(data.priority_value || data.priority?.value || "1")
    };
    this.parent = data.parent || { id: null, title: "None" };
    this.assignee = {
      id: data.assignee_id || null,
      name: data.assignee_name || data.assignee?.name || "Unassigned"
    };
    this.tags = Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',') : []);
    this.status = data.status || "Pending";
    this.createdBy = data.createdBy || "System";
    this.project = data.project || { name: "Default" };
  }
}

class TaskManager {
  tasks: Task[] = [];

  setTasks(taskList: any[]) {
    this.tasks = taskList.map(t => new Task(t));
  }

  getTaskById(taskId: any) {
    return this.tasks.find((task) => task.id === parseInt(taskId));
  }
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab1Page implements OnInit, AfterViewInit, OnDestroy {
  taskManager = new TaskManager();
  draggedElement: HTMLElement | null = null;

  constructor(
    private apiService: ApiService,
    private storageService: StorageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.registerGlobalFunctions();
  }

  ngAfterViewInit() {
    const modalEl = document.getElementById('taskModal');
    if (modalEl && modalEl.parentElement !== document.body) {
      document.body.appendChild(modalEl);
    }
  }

  ngOnDestroy() {
    const modalEl = document.getElementById('taskModal');
    if (modalEl && modalEl.parentElement === document.body) {
      document.body.removeChild(modalEl);
    }
  }

  async ionViewDidEnter() {
    // 1. Verificar sesión de usuario persistente
    const currentUser = await this.storageService.get('currentUser');
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // 2. Cargar primero la lista de tareas guardada localmente (persistencia offline)
    const cachedTasks = await this.storageService.get('cached_tasks');
    if (cachedTasks && Array.isArray(cachedTasks)) {
      this.taskManager.setTasks(cachedTasks);
      this.renderTasks(this.taskManager.tasks);
    }

    // 3. Sincronizar y refrescar desde el servidor MySQL
    this.cargarTareasAPI();
  }

  cargarTareasAPI() {
    this.apiService.getTareas().subscribe({
      next: async (data: any) => {
        if (Array.isArray(data)) {
          this.taskManager.setTasks(data);
          this.renderTasks(this.taskManager.tasks);
          // Guardar tareas en el almacén local persistente
          await this.storageService.set('cached_tasks', data);
        }
      },
      error: (err) => {
        console.error('Error al obtener tareas:', err);
        this.showToast('Mostrando información guardada en memoria local', 'warning');
      }
    });
  }

  registerGlobalFunctions() {
    const w = window as any;

    w.allowDrop = (event: DragEvent) => event.preventDefault();

    w.drag = (event: DragEvent) => {
      this.draggedElement = event.currentTarget as HTMLElement;
      this.draggedElement.classList.add("dragging");
    };

    w.drop = (event: DragEvent) => {
      event.preventDefault();
      if (!this.draggedElement) return;
      this.draggedElement.classList.remove("dragging");

      const targetColumn = (event.target as HTMLElement).closest(".kanban-column") as HTMLElement;
      if (!targetColumn) return;

      const taskId = parseInt(this.draggedElement.id.replace("task-", ""));
      const task = this.taskManager.getTaskById(taskId);

      if (task) {
        task.column = targetColumn.id;

        const payload = {
          id: task.id,
          title: task.title,
          summary: task.summary,
          details: task.details,
          columna: task.column,
          priority_level: task.priority.level,
          priority_value: task.priority.value,
          due_date: task.dueDate
        };

        this.apiService.actualizarTarea(payload).subscribe({
          next: () => {
            const colName = targetColumn.querySelector(".column-header span")?.textContent?.trim() || targetColumn.id;
            this.showToast(`Tarea movida a ${colName}`, "success");
            this.cargarTareasAPI();
          },
          error: (err) => console.error('Error actualizando posición:', err)
        });
      }

      this.draggedElement = null;
    };

    w.editTask = (taskId: number) => this.editTask(taskId);
    w.deleteTask = (taskId: number) => this.deleteTask(taskId);
    w.showTaskDetails = (taskId: number) => this.showTaskDetails(taskId);
    w.saveTask = () => this.saveTask();
    w.setTaskCategory = (columnId: string) => this.setTaskCategory(columnId);
    w.searchTasks = (term: string) => this.searchTasks(term);
    w.logout = () => this.logout();
  }

  async logout() {
    await this.storageService.clear();
    this.router.navigate(['/login']);
  }

  createTaskCard(task: Task): HTMLElement {
    const taskCard = document.createElement("div");
    taskCard.classList.add("card", "shadow-sm");
    taskCard.draggable = true;
    taskCard.id = `task-${task.id}`;
    taskCard.addEventListener("dragstart", (window as any).drag);
    taskCard.addEventListener("dragend", () => taskCard.classList.remove("dragging"));

    const nameParts = (task.assignee?.name || "U N").split(" ");
    const initials = `${nameParts[0]?.charAt(0) || ""}${nameParts[1]?.charAt(0) || ""}`.toUpperCase();
    const priorityClass = `priority-${(task.priority?.level || "low").toLowerCase()}`;

    taskCard.innerHTML = `
      <div class="card-header p-2 bg-white border-0 d-flex justify-content-between align-items-center">
        <div>
          <span class="badge bg-light text-dark border-0 shadow-xs me-1">${this.getTaskShortcut(task)}</span>
          <span class="badge p-tag ${priorityClass}">${task.priority.level}</span>
        </div>
        <div class="dropdown">
          <button class="btn btn-link p-0 text-muted" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fa-solid fa-ellipsis-vertical"></i> 
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li><button class="dropdown-item py-2 small" onclick="window.editTask(${task.id})"><i class="fa-solid fa-pen me-2 text-muted"></i>Editar</button></li>
            <li><button class="dropdown-item py-2 small text-danger" onclick="window.deleteTask(${task.id})"><i class="fa-solid fa-trash me-2"></i>Eliminar</button></li>
          </ul>
        </div>
      </div>
      <div class="card-body px-2 py-0 text-start">
        <button type="button" class="btn btn-link text-dark text-start fw-semibold p-0 m-0 text-decoration-none w-100 task-title-btn" onclick="window.showTaskDetails(${task.id})">
          ${task.title}
        </button>
        <p class="m-0 text-muted snippet small mt-1">${task.summary}</p>
        <span class="badge mt-2 parent-epic-badge" style="border-left: 3px solid ${this.assignColorToString(task.parent?.title)}">${task.parent?.title || "None"}</span>
      </div>
      <div class="card-footer p-2 bg-white border-0 small d-flex justify-content-between align-items-center mt-2">
        <span class="badge assignee-cover border text-dark" title="${task.assignee?.name || "Unassigned"}">${initials || "-"}</span>
      </div>
    `;
    return taskCard;
  }

  renderTasks(tasks: Task[]) {
    const colIds = ["todo-column", "inprogress-column", "review-column", "done-column"];
    colIds.forEach((id) => {
      const col = document.getElementById(id);
      if (!col) return;
      Array.from(col.getElementsByClassName("card")).forEach((c) => c.remove());

      tasks.filter((t) => t.column === id).forEach((t) => {
        col.appendChild(this.createTaskCard(t));
      });
    });
    this.updateTaskCounts();
  }

  searchTasks(searchTerm: string) {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      this.renderTasks(this.taskManager.tasks);
      return;
    }
    const filtered = this.taskManager.tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(normalized) ||
        task.details.toLowerCase().includes(normalized) ||
        task.assignee?.name.toLowerCase().includes(normalized)
    );
    this.renderTasks(filtered);
  }

  updateTaskCounts() {
    const columns = ["todo-column", "inprogress-column", "review-column", "done-column"];
    const totalTasks = this.taskManager.tasks.length;
    const doneTasks = this.taskManager.tasks.filter((t) => t.column === "done-column").length;

    columns.forEach((id) => {
      const col = document.getElementById(id);
      if (!col) return;
      const count = col.getElementsByClassName("card").length;
      const badge = col.querySelector(".column-header .badge");
      if (badge) badge.textContent = count.toString();
    });

    const percent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
    const indicator = document.getElementById("progress-indicator");
    const label = document.getElementById("progress-label");

    if (indicator) indicator.style.width = `${percent}%`;
    if (label) label.textContent = `${percent}% Complete`;
  }

  editTask(taskId: number) {
    const task = this.taskManager.getTaskById(taskId);
    if (!task) return;

    this.resetTaskForm();
    document.getElementById("category-wrap")?.classList.remove("d-none");
    document.getElementById("taskForm")?.classList.remove("d-none");
    document.getElementById("taskDetailsView")?.classList.add("d-none");

    (document.getElementById("task-title") as HTMLInputElement).value = task.title;
    (document.getElementById("task-summary") as HTMLInputElement).value = task.summary;
    (document.getElementById("task-details") as HTMLTextAreaElement).value = task.details;
    (document.getElementById("task-priority") as HTMLSelectElement).value = task.priority?.value.toString() || "1";
    (document.getElementById("task-category") as HTMLSelectElement).value = task.column;

    if (task.dueDate) {
      (document.getElementById("task-due-date") as HTMLInputElement).value = task.dueDate.split("T")[0];
    }

    const label = document.getElementById("taskModalLabel");
    if (label) label.innerHTML = `<i class="fa-solid fa-pen-to-square me-2 text-primary"></i>Modificar Tarea`;
    document.getElementById("save-task-btn")?.setAttribute("data-task-id", task.id.toString());

    const modalEl = document.getElementById("taskModal");
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  }

  showTaskDetails(taskId: number) {
    const task = this.taskManager.getTaskById(taskId);
    if (!task) return;

    document.getElementById("taskForm")?.classList.add("d-none");
    document.getElementById("taskDetailsView")?.classList.remove("d-none");

    const label = document.getElementById("taskModalLabel");
    if (label) label.innerHTML = `<span class="badge bg-primary-subtle text-primary border px-2 me-2">${this.getTaskShortcut(task)}</span> Inspector de Tareas`;

    (document.getElementById("task-view-title") as HTMLElement).textContent = task.title;
    (document.getElementById("task-view-details") as HTMLElement).textContent = task.details || "Sin especificaciones.";

    const pBadge = document.getElementById("task-view-priority");
    if (pBadge) {
      pBadge.textContent = task.priority?.level || "Low";
      pBadge.className = `badge p-tag priority-${(task.priority?.level || "low").toLowerCase()}`;
    }

    (document.getElementById("task-view-due-date") as HTMLElement).textContent = this.formatDate(task.dueDate);
    (document.getElementById("task-view-status") as HTMLElement).textContent = task.column.replace("-column", "").toUpperCase();

    const modalEl = document.getElementById("taskModal");
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  }

  saveTask() {
    const btn = document.getElementById("save-task-btn");
    let taskId = btn?.getAttribute("data-task-id");

    const title = (document.getElementById("task-title") as HTMLInputElement).value.trim();
    if (!title) return;

    const column = (document.getElementById("task-category") as HTMLSelectElement).value;
    const pSel = document.getElementById("task-priority") as HTMLSelectElement;

    const payload = {
      id: taskId !== "new" ? parseInt(taskId!) : null,
      title,
      summary: (document.getElementById("task-summary") as HTMLInputElement).value.trim(),
      details: (document.getElementById("task-details") as HTMLTextAreaElement).value.trim(),
      columna: column,
      priority_level: pSel.options[pSel.selectedIndex].text,
      priority_value: parseInt(pSel.value),
      due_date: (document.getElementById("task-due-date") as HTMLInputElement).value
    };

    if (taskId === "new") {
      this.apiService.crearTarea(payload).subscribe({
        next: () => {
          this.showToast("Tarea creada exitosamente", "success");
          this.cargarTareasAPI();
        },
        error: (err) => console.error('Error al crear tarea:', err)
      });
    } else {
      this.apiService.actualizarTarea(payload).subscribe({
        next: () => {
          this.showToast("Tarea actualizada correctamente", "success");
          this.cargarTareasAPI();
        },
        error: (err) => console.error('Error al actualizar tarea:', err)
      });
    }

    const modalEl = document.getElementById("taskModal");
    if (modalEl && typeof bootstrap !== 'undefined') {
      const mInstance = bootstrap.Modal.getInstance(modalEl);
      if (mInstance) mInstance.hide();
    }
  }

  deleteTask(taskId: number) {
    if (!confirm("¿Eliminar esta tarea?")) return;

    this.apiService.eliminarTarea(taskId).subscribe({
      next: () => {
        this.showToast("Tarea eliminada correctamente.", "danger");
        this.cargarTareasAPI();
      },
      error: (err) => console.error('Error al eliminar tarea:', err)
    });
  }

  setTaskCategory(columnId: string) {
    this.resetTaskForm();
    document.getElementById("category-wrap")?.classList.add("d-none");
    document.getElementById("taskForm")?.classList.remove("d-none");
    document.getElementById("taskDetailsView")?.classList.add("d-none");

    (document.getElementById("task-category") as HTMLSelectElement).value = columnId;
    const label = document.getElementById("taskModalLabel");
    if (label) label.innerHTML = `<i class="fa-solid fa-circle-plus me-2 text-success"></i>Nueva Tarea`;
    document.getElementById("save-task-btn")?.setAttribute("data-task-id", "new");

    const modalEl = document.getElementById("taskModal");
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  }

  resetTaskForm() {
    (document.getElementById("taskForm") as HTMLFormElement)?.reset();
    document.getElementById("save-task-btn")?.removeAttribute("data-task-id");
  }

  getTaskShortcut(task: Task) {
    if (!task.project?.name) return `TS-${task.id}`;
    const acronym = task.project.name.split(" ").map((w) => w[0]).join("").toUpperCase();
    return `${acronym}-${task.id}`;
  }

  assignColorToString(str: string | undefined) {
    if (!str) return "#606B73";
    const colors = ["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#d32f2f", "#0288d1"];
    const hash = Array.from(str).reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  formatDate(ds: string) {
    if (!ds) return "Sin fecha";
    return new Intl.DateTimeFormat("es-ES", { year: "numeric", month: "short", day: "numeric" }).format(new Date(ds));
  }

  showToast(message: string, type = "success") {
    const toastContainer = document.querySelector(".toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.classList.add("toast", "text-bg-" + type, "border-0");
    toast.setAttribute("role", "alert");
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 mt-2" data-bs-dismiss="toast"></button>
      </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
    }, 5000);
  }
}