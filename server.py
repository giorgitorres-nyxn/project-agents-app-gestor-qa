from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import date, datetime, timedelta
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "gestor_qa.db"
VALID_STORES = ("members", "useCases", "testCases", "bugs", "tasks", "spMigrations")


class DatabaseManager:
    """Crea y entrega conexiones SQLite para toda la aplicacion."""

    def __init__(self, db_path: Path) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            for store in VALID_STORES:
                connection.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS {store} (
                        id TEXT PRIMARY KEY,
                        payload TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    """
                )
            connection.commit()


class JsonRepository:
    """Repository generico: encapsula el acceso SQLite de cada entidad."""

    def __init__(self, database: DatabaseManager, store: str) -> None:
        if store not in VALID_STORES:
            raise ValueError(f"Store no permitido: {store}")
        self.database = database
        self.store = store

    def list(self) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                f"SELECT id, payload, created_at, updated_at FROM {self.store} ORDER BY created_at ASC"
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    def get(self, record_id: str) -> dict[str, Any] | None:
        with self.database.connect() as connection:
            row = connection.execute(
                f"SELECT id, payload, created_at, updated_at FROM {self.store} WHERE id = ?",
                (record_id,),
            ).fetchone()
        return self._row_to_record(row) if row else None

    def save(self, record: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now().isoformat(timespec="seconds")
        record_id = record.get("id") or str(uuid.uuid4())
        existing = self.get(record_id)
        created_at = existing.get("createdAt") if existing else now
        payload = {**(existing or {}), **record, "id": record_id, "createdAt": created_at, "updatedAt": now}

        with self.database.connect() as connection:
            connection.execute(
                f"""
                INSERT INTO {self.store} (id, payload, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    payload = excluded.payload,
                    updated_at = excluded.updated_at
                """,
                (record_id, json.dumps(payload, ensure_ascii=False), created_at, now),
            )
            connection.commit()
        return payload

    def delete(self, record_id: str) -> None:
        with self.database.connect() as connection:
            connection.execute(f"DELETE FROM {self.store} WHERE id = ?", (record_id,))
            connection.commit()

    @staticmethod
    def _row_to_record(row: sqlite3.Row) -> dict[str, Any]:
        payload = json.loads(row["payload"])
        payload.setdefault("id", row["id"])
        payload.setdefault("createdAt", row["created_at"])
        payload.setdefault("updatedAt", row["updated_at"])
        return payload


class QAService:
    """Capa de casos de uso: valida entidades y coordina repositorios."""

    SP_VALID_TRANSITIONS = {
        "SQL recibido": ["REST/gRPC recibido", "Finalizado"],
        "REST/gRPC recibido": ["En QA", "Finalizado"],
        "En QA": ["Matriz lista", "En revision por banco", "Finalizado"],
        "Matriz lista": ["Evidencia QMetry", "Finalizado"],
        "Evidencia QMetry": ["En revision por banco", "Finalizado"],
        "En revision por banco": ["Finalizado"],
        "Finalizado": []
    }

    def __init__(self, database: DatabaseManager) -> None:
        self.repositories = {store: JsonRepository(database, store) for store in VALID_STORES}

    def get_all_data(self) -> dict[str, list[dict[str, Any]]]:
        return {store: self.repositories[store].list() for store in VALID_STORES}

    def create(self, store: str, payload: dict[str, Any]) -> dict[str, Any]:
        self._validate_store(store)
        payload.pop("id", None)
        return self.repositories[store].save(payload)

    def update(self, store: str, record_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        self._validate_store(store)
        payload["id"] = record_id

        if store == "spMigrations":
            existing = self.repositories[store].get(record_id)
            if existing and existing.get("status") != payload.get("status"):
                self._validate_sp_transition(existing.get("status"), payload.get("status"))

        return self.repositories[store].save(payload)

    def delete(self, store: str, record_id: str) -> None:
        self._validate_store(store)
        self.repositories[store].delete(record_id)

    def seed_if_empty(self) -> None:
        if self.repositories["members"].list():
            return

        member_a = str(uuid.uuid4())
        member_b = str(uuid.uuid4())
        use_case_a = str(uuid.uuid4())
        use_case_b = str(uuid.uuid4())
        test_a = str(uuid.uuid4())
        test_b = str(uuid.uuid4())
        sp_a = str(uuid.uuid4())
        sp_b = str(uuid.uuid4())

        seed = {
            "members": [
                {"id": member_a, "name": "Laura Mendez", "role": "QA Lead", "email": "laura.qa@local", "status": "Ocupado", "capacity": 70, "focus": "Validacion de regresion del modulo de impuestos"},
                {"id": member_b, "name": "Andres Rojas", "role": "QA Automation", "email": "andres.qa@local", "status": "Disponible", "capacity": 45, "focus": "Automatizacion de flujos criticos"},
            ],
            "useCases": [
                {"id": use_case_a, "spMigrationId": sp_a, "code": "CU-001", "name": "Crear plan de pruebas", "actor": "QA Lead", "status": "Aprobado", "priority": "Alta", "observation": "Caso de uso base para validar el SP de calculo de impuestos.", "goal": "Organizar alcance, responsables y fechas de ejecucion.", "flow": "Definir alcance, agregar casos, asignar equipo y publicar plan."},
                {"id": use_case_b, "spMigrationId": sp_b, "code": "CU-002", "name": "Registrar defecto", "actor": "Analista QA", "status": "Activo", "priority": "Media", "observation": "Pendiente confirmar reglas funcionales de retencion.", "goal": "Documentar errores encontrados durante la ejecucion.", "flow": "Seleccionar caso, describir defecto, asignar severidad y responsable."},
            ],
            "testCases": [
                {"id": test_a, "spMigrationId": sp_a, "code": "CP-001", "name": "Validar creacion de caso de prueba", "useCaseId": use_case_a, "status": "Listo", "priority": "Alta", "observation": "Cubrir datos obligatorios del SP antes de automatizar.", "steps": "Crear un caso con datos obligatorios y guardar.", "expected": "El sistema conserva el registro y lo muestra en la lista."},
                {"id": test_b, "spMigrationId": sp_b, "code": "CP-002", "name": "Validar reporte de error", "useCaseId": use_case_b, "status": "Ejecutado", "priority": "Media", "observation": "Ejecucion inicial completada con validaciones pendientes.", "steps": "Ejecutar flujo con datos incompletos.", "expected": "Se muestra validacion clara al usuario."},
            ],
            "bugs": [
                {"title": "El filtro de estado no actualiza el conteo", "spMigrationId": sp_b, "testCaseId": test_b, "memberId": member_a, "severity": "Media", "status": "Asignado", "description": "El tablero conserva el conteo anterior despues de aplicar filtros.", "steps": "Entrar a errores, filtrar por Abierto y volver a Todos."}
            ],
            "tasks": [
                {"title": "Disenar matriz de pruebas de humo", "spMigrationId": sp_a, "memberId": member_a, "status": "active", "priority": "Alta", "dueDate": self._today_plus(2), "kind": "Prueba", "description": "Cubrir flujos esenciales del primer ciclo."},
                {"title": "Automatizar login y creacion de defecto", "spMigrationId": sp_b, "memberId": member_b, "status": "review", "priority": "Media", "dueDate": self._today_plus(5), "kind": "Automatizacion", "description": "Preparar escenario base para regresion."},
                {"title": "Revisar criterios de aceptacion", "spMigrationId": sp_a, "memberId": member_a, "status": "backlog", "priority": "Baja", "dueDate": self._today_plus(7), "kind": "Documentacion", "description": "Alinear casos de uso con historias priorizadas."},
            ],
            "spMigrations": [
                {
                    "id": sp_a,
                    "spName": "SP_CONT_IMPUESTO_CALCULAR",
                    "sqlReceivedDate": "2026-06-10",
                    "sqlReceived": True,
                    "devName": "Carlos Dev",
                    "qaId": member_a,
                    "status": "En QA",
                    "restReceivedDate": "2026-06-15",
                    "restReceived": True,
                    "grpcReceivedDate": "2026-06-15",
                    "grpcReceived": True,
                    "equivalenceMatrixReady": False,
                    "qmetryEvidenceReady": False,
                    "notes": "Primer SP priorizado para validar equivalencia funcional.",
                },
                {
                    "id": sp_b,
                    "spName": "SP_CONT_RETENCION_CONSULTAR",
                    "sqlReceivedDate": "2026-06-12",
                    "sqlReceived": True,
                    "devName": "Mariana Dev",
                    "qaId": member_b,
                    "status": "REST/gRPC recibido",
                    "restReceivedDate": "2026-06-18",
                    "restReceived": True,
                    "grpcReceivedDate": "2026-06-18",
                    "grpcReceived": True,
                    "equivalenceMatrixReady": False,
                    "qmetryEvidenceReady": False,
                    "notes": "QA espera confirmar reglas de entrada y salida.",
                },
            ],
        }

        for store, records in seed.items():
            for record in records:
                self.repositories[store].save(record)

    @staticmethod
    def _today_plus(days: int) -> str:
        return (date.today() + timedelta(days=days)).isoformat()

    @staticmethod
    def _validate_store(store: str) -> None:
        if store not in VALID_STORES:
            raise ValueError(f"Entidad no valida: {store}")

    def _validate_sp_transition(self, old_status: str | None, new_status: str | None) -> None:
        if old_status == new_status or not old_status:
            return
        allowed = self.SP_VALID_TRANSITIONS.get(old_status, [])
        if new_status not in allowed:
            raise ValueError(f"Transición inválida: no se puede ir de \"{old_status}\" a \"{new_status}\"")


class QARequestHandler(SimpleHTTPRequestHandler):
    """Controlador HTTP minimo para API JSON y archivos estaticos."""

    service: QAService

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self) -> None:
        if self.path == "/":
            self.path = "/index.html"
            return super().do_GET()
        if self.path.startswith("/api/"):
            return self._handle_api_get()
        return super().do_GET()

    def do_POST(self) -> None:
        self._handle_write("POST")

    def do_PUT(self) -> None:
        self._handle_write("PUT")

    def do_DELETE(self) -> None:
        parts = self._api_parts()
        route = self._record_route(parts)
        if not route:
            return self._send_json({"error": "Ruta DELETE invalida"}, HTTPStatus.BAD_REQUEST)
        store, record_id = route
        try:
            self.service.delete(store, record_id)
            self.send_response(HTTPStatus.NO_CONTENT)
            self.end_headers()
        except ValueError as error:
            self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)

    def _handle_api_get(self) -> None:
        parts = self._api_parts()
        if parts == ["data"]:
            return self._send_json(self.service.get_all_data())
        if parts == ["export"]:
            return self._send_export()
        self._send_json({"error": "Ruta GET no encontrada"}, HTTPStatus.NOT_FOUND)

    def _handle_write(self, method: str) -> None:
        parts = self._api_parts()
        payload = self._read_json()
        try:
            if method == "POST" and len(parts) == 1:
                record = self.service.create(parts[0], payload)
                return self._send_json(record, HTTPStatus.CREATED)
            route = self._record_route(parts)
            if method == "PUT" and route:
                record = self.service.update(route[0], route[1], payload)
                return self._send_json(record)
            self._send_json({"error": "Ruta de escritura invalida"}, HTTPStatus.BAD_REQUEST)
        except ValueError as error:
            self._send_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)

    def _api_parts(self) -> list[str]:
        path = urlparse(self.path).path
        return [part for part in path.removeprefix("/api/").split("/") if part]

    def _record_route(self, parts: list[str]) -> tuple[str, str] | None:
        if len(parts) == 2:
            return parts[0], parts[1]
        query = parse_qs(urlparse(self.path).query)
        record_ids = query.get("id", [])
        if len(parts) == 1 and record_ids:
            return parts[0], record_ids[0]
        return None

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body)

    def _send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_export(self) -> None:
        body = json.dumps(self.service.get_all_data(), ensure_ascii=False, indent=2).encode("utf-8")
        filename = f"gestor-qa-{date.today().isoformat()}.json"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class AppFactory:
    """Factory Method simple para ensamblar dependencias de la aplicacion."""

    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.database = DatabaseManager(db_path)

    def create_server(self, host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
        self.database.initialize()
        service = QAService(self.database)
        service.seed_if_empty()
        QARequestHandler.service = service
        return ThreadingHTTPServer((host, port), QARequestHandler)


def main() -> None:
    server = AppFactory().create_server()
    host, port = server.server_address
    print(f"Gestor QA listo en http://{host}:{port}")
    print(f"Base de datos: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
