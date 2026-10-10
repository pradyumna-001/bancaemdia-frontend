// Disposable presentation data only; public builds never import this module.
import type { Plugin } from 'vite';
import type { components } from '../../src/api/schema';
import { apostasDensas } from './apostas';
import { detalheExemplo, matrizExemplo, revisaoDePar } from './detalhe';

export function detalhePreview(): Plugin {
  return {
    name: 'detalhe-exclusivo-do-exercicio',
    configurePreviewServer(server) {
      const rows = new Map(
        apostasDensas.map((row) => [
          row.chave,
          structuredClone(row) as components['schemas']['BetResponse'],
        ]),
      );
      const events = new Map<
        string,
        components['schemas']['BetEventResponse'][]
      >();
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
        const path = url.pathname;
        const send = (data: unknown, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(data));
        };
        if (path === '/api/v1/titulares')
          return send({
            data: [matrizExemplo.titular],
            page: 1,
            page_size: 20,
            total: 1,
          });
        if (path === '/api/v1/titulares/1/matriz') return send(matrizExemplo);
        if (path === '/api/v1/revisao/8')
          return send({ ...revisaoDePar, midia_hash: null, foto_url: null });
        if (path === '/api/v1/apostas') {
          const page = Number(url.searchParams.get('page') ?? 1);
          const size = Number(url.searchParams.get('page_size') ?? 50);
          const data = [...rows.values()];
          return send({
            data: data.slice((page - 1) * size, page * size),
            pagination: { page, page_size: size, total: data.length },
          });
        }
        const match =
          /^\/api\/v1\/apostas\/([^/]+)(?:\/(restaurar|resultado))?$/.exec(
            path,
          );
        if (!match) return next();
        const key = decodeURIComponent(match[1]!);
        const aposta = rows.get(key);
        if (!aposta)
          return send({ detail: 'não encontramos esta aposta' }, 404);
        if (req.method === 'GET')
          return send({
            aposta,
            fonte_contextual: false,
            consolidacoes: [],
            revisao_pendente: null,
            selecoes: {
              casa: aposta.casa,
              evento: aposta.evento,
              descricao: aposta.descricao,
              mercado: aposta.mercado,
            },
            eventos: events.get(key) ?? detalheExemplo.eventos,
          });
        if (!['PATCH', 'DELETE', 'POST'].includes(req.method ?? ''))
          return send({ detail: 'ação indisponível' }, 405);
        let text = '';
        for await (const chunk of req) {
          text += chunk;
          if (text.length > 65536)
            return send({ detail: 'pedido grande demais' }, 413);
        }
        let body: components['schemas']['Correcao'] &
          components['schemas']['Resultado'];
        try {
          body = text ? JSON.parse(text) : {};
        } catch {
          return send({ detail: 'pedido inválido' }, 422);
        }
        let tipo = 'CORRECAO_MANUAL';
        if (req.method === 'DELETE') {
          aposta.apagada = true;
          tipo = 'APOSTA_CANCELADA';
        } else if (match[2] === 'restaurar') {
          aposta.apagada = false;
          tipo = 'SELECAO_ALTERADA';
        } else if (match[2] === 'resultado') {
          aposta.estado = body.estado;
          aposta.lucro_centavos = null;
          aposta.retorno_centavos = body.cashout_valor_centavos ?? null;
          tipo = 'RESULTADO_REGISTRADO';
        } else {
          for (const field of [
            'evento',
            'descricao',
            'casa',
            'data_aposta',
            'data_jogo',
          ] as const)
            if (Object.hasOwn(body, field)) aposta[field] = body[field] ?? null;
          if (Object.hasOwn(body, 'mercado_bruto'))
            aposta.mercado = body.mercado_bruto ?? null;
          if (typeof body.odd === 'number') aposta.odd = body.odd;
          if (typeof body.stake_unidades === 'number')
            aposta.stake_unidades = body.stake_unidades;
          if (typeof body.freebet === 'boolean') {
            aposta.freebet = body.freebet;
            aposta.stake_centavos = body.freebet ? 0 : 5000;
          }
          if (Object.hasOwn(body, 'conta_casa_id')) {
            aposta.conta_casa_id = body.conta_casa_id ?? null;
            aposta.conta_atribuicao =
              body.conta_casa_id === null ? 'UNASSIGNED' : 'ASSIGNED';
            aposta.conta_contexto =
              body.conta_casa_id === null
                ? null
                : {
                    id: '4',
                    casa_id: '7',
                    apelido: 'Conta histórica',
                    ativa: false,
                    estado: 'ENCERRADA',
                    titular: { id: '1', nome: 'Ana', arquivado: true },
                  };
          }
        }
        const previous = events.get(key) ?? [...detalheExemplo.eventos];
        previous.push({
          tipo,
          fonte: 'manual',
          criado_em: '2026-10-10T23:00:00Z',
          confianca: null,
          payload: body,
        });
        events.set(key, previous);
        return send({ aposta, eventos_gravados: 1 });
      });
    },
  };
}
