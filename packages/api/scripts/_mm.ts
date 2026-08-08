import { instalarDom } from '../src/services/juez-diagramas/entorno-dom.js';
async function main() {
  instalarDom();
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  const api = (mermaid as any).mermaidAPI;
  for (const [k, code] of Object.entries({
    mindmap: 'mindmap\n  root((Plataforma))\n    Catalogo\n      Busqueda\n    Pedidos',
    treemap: 'treemap-beta\n"Raiz"\n  "A": 10\n  "B": 20',
    treeView: 'treeView-beta\n  packages\n    api\n    web',
    ishikawa: 'ishikawa-beta\nEfecto\n  Proceso\n    Causa',
  })) {
    await mermaid.parse(code);
    const { db } = await api.getDiagramFromText(code);
    const raiz = db.getMindmap?.() ?? db.getRoot?.() ?? db.root;
    console.log('###', k, JSON.stringify(raiz, (kk, v) => kk === 'parent' ? undefined : v).slice(0, 420));
  }
}
void main();
