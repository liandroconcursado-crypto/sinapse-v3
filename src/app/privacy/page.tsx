export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <span className="eyebrow">SINAPSE</span>
      <h1>Política de privacidade do beta</h1>
      <p>Última atualização: 9 de setembro de 2026.</p>
      <h2>Dados tratados</h2>
      <p>O SINAPSE armazena os dados da conta e o conteúdo que você envia ao seu vault, incluindo notas, conexões, fontes e histórico de ingestão.</p>
      <h2>Finalidade</h2>
      <p>Esses dados são usados para autenticar sua conta, organizar e recuperar suas memórias e entregar as funções solicitadas pelo aplicativo e pelo MCP.</p>
      <h2>ChatGPT e MCP</h2>
      <p>Quando você autoriza a conexão, o ChatGPT pode ler ou gravar conteúdo no seu vault conforme a ferramenta invocada. O acesso é limitado à sua conta por OAuth e pode ser revogado.</p>
      <h2>Compartilhamento e publicidade</h2>
      <p>O conteúdo do vault não é vendido nem usado para publicidade. Provedores de infraestrutura podem processar dados somente para hospedar e operar o serviço.</p>
      <h2>Portabilidade e exclusão</h2>
      <p>Você pode exportar o vault em Markdown. Para exclusão ou dúvidas, abra um contato no <a href="https://github.com/liandroconcursado-crypto/sinapse-v3/issues">repositório oficial</a> sem incluir conteúdo privado na mensagem pública.</p>
      <h2>Segurança e limites</h2>
      <p>Aplicamos isolamento por usuário e controles de acesso, mas nenhum beta deve ser usado como única cópia de informação crítica ou altamente sensível.</p>
    </main>
  );
}
