# Gerenciamento de Cuidadores

Sistema web full-stack para controle e gestão de **casas (imóveis atendidos)**, **proprietários e sócios**, **cuidadores** e **alocações** de profissionais por período.

---

## Funcionalidades

- **Visão Geral (Dashboard):** Painel resumido com indicadores de casas cadastradas, cuidadores, alocações ativas, donos, lista de alocações em andamento, imóveis sem cuidador e soma total dos valores das casas.
- **Gestão de Casas:** Cadastro, edição, busca e exclusão de imóveis com endereço, CEP, valor, dados de contato do proprietário e gerenciamento dinâmico de sócios vinculados à casa.
- **Gestão de Cuidadores:** Cadastro, edição, busca e exclusão de profissionais com validação de CPF e telefone, upload de foto (recortada e comprimida automaticamente no navegador) e indicador em tempo real de disponibilidade (`Disponível` ou `Indisponível`).
- **Gestão de Alocações:** Registro de períodos de atendimento vinculando um cuidador a uma casa, com data de entrada, data de saída (opcional para alocações em andamento), observações e bloqueio automático de cuidadores já alocados em outras casas ativas.
- **Donos e Sócios:** Visão consolidada que agrupa os imóveis por proprietário, exibindo contatos, casas pertencentes e os sócios de cada propriedade.
- **Configuração Dinâmica da API:** Campo na barra lateral da interface para alterar e testar a URL base do back-end em tempo real (salva em `localStorage`).

---

## Tecnologias Utilizadas

### Back-end
- **Java 25**
- **Spring Boot 4.1.2** (Spring Web MVC, Spring Data JPA)
- **MySQL** (`mysql-connector-j`)
- **Springdoc OpenAPI / Swagger UI 3.2.0**
- **Maven** (com Maven Wrapper incluído)

### Front-end
- **HTML5** (elementos semânticos e modais nativos `<dialog>`)
- **CSS3** (variáveis CSS, Grid Layout, Flexbox e design responsivo)
- **JavaScript (ES6+)** (arquitetura SPA sem frameworks pesados)
- **jQuery 3.7.1 & jQuery Mask Plugin 1.14.16** (máscaras para CPF, telefone, CEP e datas)

---

## Estrutura do Projeto

```text
gerenciamento-cuidadores/
├── src/
│   ├── main/
│   │   ├── java/com/_dt/gerenciamento_cuidadores/
│   │   │   ├── controller/
│   │   │   │   ├── AlocacaoController.java      # Endpoints REST de alocações
│   │   │   │   ├── CasaController.java          # Endpoints REST de casas e sócios
│   │   │   │   ├── CasaPessoaController.java    # Endpoints REST de vínculos casa-pessoa
│   │   │   │   ├── CuidadorController.java      # Endpoints REST de cuidadores
│   │   │   │   └── PessoaController.java        # Endpoints REST de pessoas
│   │   │   ├── entities/
│   │   │   │   ├── Alocacao.java                # Entidade de alocação (casa x cuidador)
│   │   │   │   ├── Casa.java                    # Entidade de imóvel e proprietário
│   │   │   │   ├── CasaPessoa.java              # Relacionamento entre casa e pessoa
│   │   │   │   ├── Cuidador.java                # Entidade de cuidador (com foto Base64)
│   │   │   │   ├── Pessoa.java                  # Entidade genérica de pessoa
│   │   │   │   ├── Socio.java                   # Entidade de sócio vinculado a uma casa
│   │   │   │   └── TipoVinculo.java             # Enum (PROPRIETARIO, SOCIO)
│   │   │   ├── repositories/                    # Interfaces Spring Data JPA
│   │   │   ├── util/
│   │   │   │   └── Validacoes.java              # Validação de CPF, telefone, CEP e e-mail
│   │   │   └── GerenciamentoCuidadoresApplication.java
│   │   └── resources/
│   │       ├── application.properties           # Configurações do banco de dados e JPA
│   │       └── static/
│   │           ├── index.html                   # Interface principal (SPA)
│   │           ├── style.css                    # Estilos da aplicação
│   │           └── app.js                       # Lógica de interface, máscaras e consumo da API
│   └── test/                                    # Testes automatizados
├── pom.xml                                      # Dependências e configuração Maven
├── mvnw / mvnw.cmd                              # Maven Wrapper
└── README.md

```

---

## Pré-requisitos

* **JDK 25** ou superior instalado e configurado no `PATH` (`JAVA_HOME`).
* **MySQL 8.0+** em execução local.
* **Maven** (opcional, pois o projeto acompanha o wrapper `./mvnw`).

---

## Configuração e Execução

1. **Crie o banco de dados no MySQL:**
```sql
CREATE DATABASE gerenciamentoCuidadores;

```


2. **Configure as credenciais de acesso:**
Edite o arquivo `src/main/resources/application.properties` caso seu usuário ou senha do MySQL sejam diferentes do padrão:
```properties
spring.application.name=gerenciamento-cuidadores
spring.datasource.url=jdbc:mysql://localhost:3306/gerenciamentoCuidadores
spring.datasource.username=root
spring.datasource.password=root
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

```


> As tabelas são criadas e atualizadas automaticamente pelo Hibernate (`ddl-auto=update`) ao iniciar a aplicação.


3. **Execute a aplicação:**
* **Linux / macOS:**
```bash
./mvnw spring-boot:run

```


* **Windows:**
```cmd
mvnw.cmd spring-boot:run

```




4. **Acesse no navegador:**
* **Aplicação Web:** `http://localhost:8080`
* **Documentação da API (Swagger UI):** `http://localhost:8080/swagger-ui.html`
* **Especificação OpenAPI (JSON):** `http://localhost:8080/v3/api-docs`



---

## Endpoints da API REST

### Casas (`/api/casas`)

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/casas` | Lista todas as casas e seus respectivos sócios |
| `GET` | `/api/casas/{id}` | Busca uma casa pelo ID |
| `POST` | `/api/casas` | Cadastra uma nova casa (com validação de CEP, telefone e e-mail) |
| `PUT` | `/api/casas/{id}` | Atualiza os dados da casa e substitui sua lista de sócios |
| `DELETE` | `/api/casas/{id}` | Remove uma casa pelo ID |

### Cuidadores (`/api/cuidadores`)

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/cuidadores` | Lista todos os cuidadores cadastrados |
| `GET` | `/api/cuidadores/{id}` | Busca um cuidador pelo ID |
| `POST` | `/api/cuidadores` | Cadastra um novo cuidador (valida CPF, telefone e foto em Data URL) |
| `PUT` | `/api/cuidadores/{id}` | Atualiza os dados de um cuidador |
| `DELETE` | `/api/cuidadores/{id}` | Remove um cuidador pelo ID |

### Alocações (`/api/alocacoes`)

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/alocacoes` | Lista todas as alocações registradas |
| `GET` | `/api/alocacoes/{id}` | Busca uma alocação pelo ID |
| `POST` | `/api/alocacoes` | Registra uma nova alocação entre casa e cuidador |
| `PUT` | `/api/alocacoes/{id}` | Atualiza datas ou observações de uma alocação |
| `DELETE` | `/api/alocacoes/{id}` | Exclui uma alocação pelo ID |

### Endpoints Auxiliares (`/api/pessoas` e `/api/casa-pessoas`)

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` / `POST` / `DELETE` | `/api/pessoas` | Gerenciamento de registros genéricos de pessoas |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/casa-pessoas` | Gerenciamento de vínculos (`PROPRIETARIO` / `SOCIO`) entre casas e pessoas |

---

## Regras de Validação Implementadas

* **CPF:** Validação matemática dos dígitos verificadores, rejeição de sequências repetidas (ex.: `111.111.111-11`) e normalização automática para o formato `000.000.000-00`.
* **Telefone:** Aceita números brasileiros com DDD contendo 10 dígitos (fixo) ou 11 dígitos (celular).
* **CEP:** Validação de 8 dígitos numéricos no formato `00000-000`.
* **E-mail:** Validação sintática de endereço eletrônico.
* **Foto de Perfil:** Aceita apenas imagens em formato `data:image/`, com redimensionamento automático para `320x320 px` (JPEG) no front-end e limite de segurança no back-end.
* **Conflito de Alocação:** Impede que um cuidador com alocação ativa (sem data de saída ou com saída futura) seja alocado simultaneamente em outra residência.

