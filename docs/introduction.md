# Introduction

## What the application is useful for

Modern software is no longer a single program running on a single machine. It
is a network of web applications, mobile clients, background workers and
third-party integrations that constantly exchange requests and emit events.
Every one of those interactions carries information that is valuable to the
people who build and operate the system: how often a feature is used, how an
API behaves under load, when errors begin to appear, and how usage changes
after a new version is released. In practice, however, this information is
scattered. It lives in raw log files, in disconnected monitoring tools, in ad
hoc spreadsheets, or it is simply never collected at all. As a result, teams
frequently learn about performance regressions, broken integrations or
abnormal usage only after their users do.

**Hotlog** is a web application that addresses exactly this problem. It is a
centralized platform for **API monitoring, usage analytics and version
management**: a single place where a team can track the performance of its
services, visualize how its product is actually being used, manage the
evolution of its data over successive versions, and keep production systems
stable. Instead of forcing developers to assemble their own observability
stack from many separate tools, Hotlog provides an integrated workflow — from
sending the first event to interpreting it on a dashboard.

Concretely, the application is useful because it allows a team to:

- **Integrate quickly.** An application is connected through a lightweight
  SDK or HTTP endpoint, authenticated by a project API key, without any
  complex infrastructure setup on the user's side.
- **Collect structured telemetry.** Events are not dumped as free-form text;
  they are sent against an explicitly defined schema, so the data that
  arrives is consistent, typed and immediately analyzable.
- **Understand behaviour visually.** Ingested events are turned into
  customizable dashboards composed of charts and other visual components, so
  that complex data becomes understandable at a glance.
- **Collaborate safely.** Multiple users can work on the same project as a
  team, with fine-grained, role-based control over who may read or change
  schemas, events, dashboards, members and keys.
- **Evolve without breaking history.** The data definitions can change over
  time while previously collected events remain valid and interpretable.

In other words, the application is useful as a practical instrument that
converts the continuous, low-level stream of events produced by a running
system into reliable, shared, decision-ready knowledge.

## The meaning and essence of the application

Beyond its immediate utility, the deeper meaning of Hotlog lies in the way it
treats data. The central idea of the application is the **schema-first,
contract-based model of event data**.

In most logging and analytics tools, an event is whatever the sender decides
to put into it at the moment it is sent. This makes data easy to produce but
hard to trust: the same conceptual event may be recorded in different shapes,
fields may silently change meaning, and historical data may stop matching
current expectations. Hotlog deliberately reverses this relationship. Before a
project sends events, it defines **schemas** and their **fields**. Each field
has a type and a set of constraints. Most importantly, the identifying key of
a schema or field is an **immutable contract**: once it exists it does not
change, and removal is expressed as an explicit "archived" state rather than
deletion. Human-readable names can still be edited freely, but the contract
itself is stable. Because of this, an event ingested today will remain valid
and interpretable indefinitely, even after the schema has been extended or
reorganized for newer versions of the application.

This single design decision is what gives the platform its meaning. It
transforms a heap of log lines into a **governed body of knowledge**: every
event is tied to a known, versioned definition; every dashboard is built on
data whose shape is guaranteed; and the history of a system remains a
trustworthy record rather than an archaeological puzzle.

The essence of the application can therefore be summarized as a layered
transformation of information:

1. **Definition** — the team describes *what* it wants to measure by
   declaring schemas and typed fields (the immutable contract).
2. **Ingestion** — running applications send events against those contracts
   through the SDK/API, authenticated per project.
3. **Storage and isolation** — events are stored in a multi-tenant database
   where each project's data is strictly isolated and access is mediated by
   row-level security and a role/permission model, rather than trust in the
   client.
4. **Interpretation** — events are aggregated and rendered as visual,
   role-aware dashboards that turn raw telemetry into insight.

Hotlog, in its essence, is the system that holds these four layers together
into one coherent, collaborative and secure product. Its meaning is not
"another logging tool", but a disciplined approach to organizational memory
about how software is used and how it behaves.

## Relevance and topicality

The topic of this work is relevant for several converging reasons. First,
contemporary software architectures are increasingly API-driven, distributed
and event-oriented; the volume of inter-service and client-server events grows
with every added integration, and the inability to observe them becomes a
direct operational risk. Second, observability and product analytics have
become an expected, not optional, part of professional software delivery,
yet the available solutions tend to split into two extremes: heavyweight
enterprise platforms that are costly and complex to adopt, and minimal
home-grown logging that lacks structure, access control and longevity. Third,
software is released continuously, so the ability to manage the evolution of
data definitions across versions — without invalidating historical data — is a
genuine and largely unsolved practical need. A self-serve, schema-governed,
multi-tenant platform that is fast to integrate and safe to share with a team
therefore answers a current and well-motivated demand.

## Aim and objectives

The **aim** of this diploma work is to design and implement Hotlog — a web
application that provides centralized, schema-first monitoring, analytics and
version management of application and API events for collaborative teams.

To achieve this aim, the following **objectives** were defined:

1. Analyze the problem domain of API monitoring, event analytics and data
   versioning, and review existing approaches and their limitations.
2. Design a schema-first data model based on immutable schema/field contracts
   with soft-delete (archival) semantics that preserve historical validity.
3. Design and implement a secure, multi-tenant database, including a
   role-based access-control model and row-level security policies that act
   as the real authorization boundary.
4. Implement an event-ingestion pipeline that authenticates senders by
   hashed project API keys and validates payloads against active schemas.
5. Implement an interactive, customizable dashboard system (layouts and
   visualization components) with role-aware visibility.
6. Provide an SDK and introspection mechanism so that client applications can
   integrate and generate typed bindings with minimal effort.
7. Implement supporting capabilities — authentication, team invitations,
   internationalization — and validate the resulting system.

## Object and subject of research

The **object** of research is the process of collecting, storing, securing
and analyzing event data produced by modern web and API-based software
systems.

The **subject** of research is the set of models, methods and architectural
solutions for building a schema-first, multi-tenant event monitoring platform:
specifically, the immutable-contract data model, the API-key-based ingestion
mechanism, the row-level-security authorization model, and the visualization
layer, as realized in the Hotlog application.

## Methods and technological basis

The work relies on methods of system analysis and software design, relational
data modelling, and the design of access-control and security mechanisms. The
practical implementation is built on a modern web technology stack: a
Next.js-based application written in TypeScript, a managed PostgreSQL database
(Supabase) with row-level security and `SECURITY DEFINER` functions as the
authorization mechanism, a client data layer based on server state management,
and an internationalized user interface supporting multiple languages.

## Practical significance

The practical significance of the work is that the result is not a
theoretical model but a functioning, deployable application that can be used
by real development teams to monitor and analyze their systems. The proposed
immutable-contract approach offers a reusable solution to the recurring
problem of evolving data definitions without losing historical validity, and
the security architecture demonstrates how strict multi-tenant isolation can
be achieved at the database level rather than relying on application-side
trust. The platform is directly applicable to API providers, product teams
and any organization that needs structured, governed insight into how its
software is used and how it performs.

## Structure of the thesis

The thesis consists of an introduction, the main chapters, a conclusion and a
list of references. The introduction substantiates the relevance of the topic
and formulates the aim and objectives. The subsequent chapters present the
analysis of the problem domain and existing solutions; the design of the
system architecture and the schema-first, secured data model; the
implementation of the ingestion pipeline, the dashboard system and the
supporting subsystems; and the testing and evaluation of the resulting
application. The conclusion summarizes the results achieved with respect to
the stated objectives and outlines directions for further development.
