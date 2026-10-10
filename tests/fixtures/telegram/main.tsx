// HTTP and controls of this demonstration exist only in the isolated test build.
import '../../../src/main';

document.getElementById('simular-vinculo')!.addEventListener('click', () => {
  void fetch('/fixture/telegram/connect', { method: 'POST' }).then(() => {
    document.getElementById('simulacao-aviso')!.textContent =
      'Conexão simulada. Use Consultar vínculo na tela abaixo.';
  });
});
