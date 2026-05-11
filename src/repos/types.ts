// Tipos compartilhados pelos repos.
// Toda operação recebe um `Ctx` com o usuário autenticado.
//
// Os repos NÃO chamam middleware nem cookies — quem chama (server function)
// é responsável por validar o auth e passar o `userId`.

export type Ctx = {
  userId: string;
};

export type CtxWs = Ctx & {
  workspaceId: string;
};

/** Atalho para 403 (HTTP) consistente em todo o backend. */
export class Proibido extends Error {
  status = 403;
  constructor(msg = "Forbidden") {
    super(msg);
  }
  toResponse() {
    return new Response(this.message, { status: this.status });
  }
}

export class NaoEncontrado extends Error {
  status = 404;
  constructor(msg = "Not found") {
    super(msg);
  }
  toResponse() {
    return new Response(this.message, { status: this.status });
  }
}
