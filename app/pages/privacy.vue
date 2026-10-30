<script setup lang="ts">
// Size justification: this file is LEGAL PROSE, not logic — the full policy text
// held twice, once per locale, inside `v-if="locale === 'it'"` blocks. Splitting
// it would scatter one legal document across files and make it harder to check one
// version against the other. Left whole deliberately. The cookie table lives in
// pages/cookies.vue (single source: utils/legal/cookies.ts), never here.
// DRAFT for lawyer review. Update both locales together and bump
// LEGAL_POLICY_VERSION on any material change (docs/legal/release-legal-checklist.md).
import {
  LEGAL_ENTITY,
  LEGAL_LAST_UPDATED,
  LEGAL_POLICY_VERSION,
} from '~/utils/legal/cookies';

definePageMeta({ layout: 'legal' });
const { locale, t } = useI18n();
const config = useRuntimeConfig();

useSeoMeta({
  title: () => t('seo.titles.privacy'),
  ogTitle: () => `${t('seo.titles.privacy')} | House M8`,
  description: () => t('seo.descriptions.privacy'),
  ogDescription: () => t('seo.descriptions.privacy'),
  ogUrl: `${config.public.baseUrl}/privacy`,
});
</script>

<template>
  <div>
    <template v-if="locale === 'it'">
      <h1>Informativa sulla privacy</h1>
      <p>
        Informativa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679
        (GDPR).<br />
        <strong>Versione {{ LEGAL_POLICY_VERSION }}</strong> — in vigore dal
        TODO: data di entrata in vigore.<br />
        <strong>Ultimo aggiornamento:</strong> {{ LEGAL_LAST_UPDATED }}
      </p>

      <h2 id="section-1">1. Titolare del trattamento</h2>
      <p>
        Il titolare del trattamento è {{ LEGAL_ENTITY.name }} ({{
          LEGAL_ENTITY.legalForm
        }}), con sede in {{ LEGAL_ENTITY.address }}, P.IVA
        {{ LEGAL_ENTITY.vatNumber }}, REA {{ LEGAL_ENTITY.rea }}, PEC
        {{ LEGAL_ENTITY.pec }} (di seguito "il titolare", "noi"). Per qualsiasi
        richiesta sulla privacy
        <LegalMailLink
          :email="LEGAL_ENTITY.privacyEmail"
          lead="scrivi a"
          fallback="usa le impostazioni privacy dell'app"
        />. Non è stato nominato un Responsabile della protezione dei dati
        (DPO), non essendo obbligatorio.
      </p>

      <h2 id="section-2">2. Dati trattati</h2>
      <ul>
        <li>
          <strong>Account:</strong> email, password (conservata solo come hash),
          nome, cognome e avatar. Nome e avatar sono visibili ai coinquilini
          della tua casa; l'email non è mai mostrata ad altri utenti. Se accedi
          con Google riceviamo nome ed email; la foto del tuo account Google non
          viene importata.
        </li>
        <li>
          <strong>Profilo facoltativo</strong> (solo se attivi la condivisione
          del profilo): genere, bio, occupazione, studi o lavoro, lingue
          parlate, animali domestici, telefono, profili social e foto del
          profilo. Non raccogliamo luogo di nascita, nazionalità, data di
          nascita né abitudine al fumo, e non trattiamo categorie particolari di
          dati (art. 9).
        </li>
        <li>
          <strong>Dati della casa condivisa:</strong> appartenenza alla casa e
          ruolo, inviti, spese e relative quote, bollette, promemoria, note in
          bacheca, segnalazioni (anche con immagini) e report mensili.
        </li>
        <li>
          <strong>Abbonamento e pagamenti</strong> (piani a pagamento): email,
          nome, indirizzo di fatturazione e partita IVA se li inserisci, piano e
          stato dell'abbonamento, fatture. I dati della carta sono raccolti e
          conservati direttamente da Stripe; noi non li vediamo né li
          conserviamo.
        </li>
        <li>
          <strong>Consensi e accettazioni:</strong> versione dei Termini
          accettata, presa visione dell'informativa, consenso alla condivisione
          del profilo e, per i piani a pagamento, la richiesta di avvio
          immediato del servizio, ciascuno con data e versione.
        </li>
        <li>
          <strong>Eventi di sicurezza:</strong> accessi riusciti e falliti,
          registrazione, reset password, esportazione dei dati, richiesta e
          annullamento della cancellazione, cambi di ruolo e di proprietario
          della casa, modifiche ai consensi, recesso dall'abbonamento. Ogni
          evento riporta data, utente e un indirizzo IP pseudonimizzato (HMAC
          con chiave segreta, non reversibile da terzi).
        </li>
        <li>
          <strong>Limitazione dei tentativi (rate limiting):</strong>
          indirizzo IP pseudonimizzato, conservato per breve tempo.
        </li>
        <li>
          <strong>Email transazionali:</strong> indirizzo email, nome e
          contenuto dei messaggi (verifica, reset password, inviti, promemoria,
          report, conferma di abbonamento e di cancellazione).
        </li>
        <li>
          <strong>Dati tecnici:</strong> log dei fornitori di infrastruttura (ad
          esempio indirizzo IP e data/ora delle richieste) e i cookie descritti
          nella <NuxtLink to="/cookies">Cookie Policy</NuxtLink>.
        </li>
        <li>
          <strong>Registro delle richieste privacy:</strong> traccia delle
          richieste di esportazione e cancellazione dei dati.
        </li>
      </ul>

      <h2 id="section-3">3. Finalità e basi giuridiche</h2>
      <div
        class="overflow-x-auto"
        role="region"
        tabindex="0"
        aria-labelledby="section-3"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Finalità</th>
              <th scope="col">Base giuridica</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Creare e gestire l'account, autenticarti, fornire le funzioni
                della casa condivisa (spese, bollette, bacheca, segnalazioni,
                report) e inviare email di servizio
              </td>
              <td>Art. 6(1)(b) — esecuzione del contratto</td>
            </tr>
            <tr>
              <td>
                Gestire l'abbonamento a pagamento, la fatturazione e i pagamenti
              </td>
              <td>
                Art. 6(1)(b) — esecuzione del contratto; art. 6(1)(c) — obblighi
                fiscali e contabili
              </td>
            </tr>
            <tr>
              <td>
                Compilare il profilo facoltativo e mostrarlo ai coinquilini
              </td>
              <td>
                Art. 6(1)(a) — consenso, revocabile in ogni momento in
                Impostazioni › Privacy
              </td>
            </tr>
            <tr>
              <td>
                Sicurezza del servizio, prevenzione degli abusi (limitazione dei
                tentativi di accesso, registro degli eventi di sicurezza)
              </td>
              <td>Art. 6(1)(f) — legittimo interesse alla sicurezza</td>
            </tr>
            <tr>
              <td>
                Cookie tecnici e di preferenza (vedi
                <NuxtLink to="/cookies">Cookie Policy</NuxtLink>)
              </td>
              <td>
                Art. 6(1)(f) — legittimo interesse; art. 122 Codice Privacy
                (nessun consenso per i cookie tecnici)
              </td>
            </tr>
            <tr>
              <td>
                Gestire le richieste di esercizio dei diritti e documentare la
                cancellazione degli account
              </td>
              <td>
                Art. 6(1)(c) — obbligo legale; art. 6(1)(f) — accountability
              </td>
            </tr>
            <tr>
              <td>
                Prevenzione delle frodi e antiriciclaggio sui pagamenti (da
                parte di Stripe, come titolare autonomo)
              </td>
              <td>Art. 6(1)(c) e (f) — a cura di Stripe, vedi la sezione 5</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="section-4">4. Natura del conferimento</h2>
      <p>
        Email, password (o accesso con Google), nome e cognome sono necessari
        per creare l'account: senza di essi non possiamo fornire il servizio. Il
        profilo facoltativo è trattato solo con il tuo consenso: non attivarlo
        non limita l'uso delle funzioni principali. Per i piani a pagamento i
        dati di fatturazione sono necessari per concludere il contratto e
        adempiere agli obblighi fiscali.
      </p>

      <h2 id="section-5">5. Destinatari e responsabili del trattamento</h2>
      <p>
        I dati non sono venduti. Sono comunicati ai fornitori seguenti, che
        agiscono come responsabili del trattamento (art. 28) o, dove indicato,
        come titolari autonomi, e agli altri membri della tua casa:
      </p>
      <ul>
        <li>
          <strong>Coinquilini:</strong> vedono il tuo nome e il tuo avatar e, se
          hai attivato la condivisione del profilo, i campi facoltativi del
          profilo; non vedono mai la tua email. Le spese e i dati finanziari
          della casa sono visibili ai membri della casa.
        </li>
        <li>
          <strong>Vercel Inc.</strong> (USA) — hosting dell'applicazione. Le
          funzioni del server sono eseguite nella regione di Dublino (UE); i
          contenuti statici sono distribuiti dalla rete CDN globale.
        </li>
        <li>
          <strong>Supabase</strong> (Supabase Pte. Ltd., Singapore) — database,
          ospitato su AWS eu-central-1, Francoforte (UE).
        </li>
        <li>
          <strong>Resend</strong> (Plus Five Five, Inc., USA) — invio delle
          email transazionali.
        </li>
        <li>
          <strong>Google Ireland Limited</strong> — solo se scegli l'accesso con
          Google (OAuth).
        </li>
        <li>
          <strong>Stripe Payments Europe, Ltd.</strong> (Irlanda) — pagamenti
          degli abbonamenti. È nostro responsabile del trattamento per
          l'esecuzione dei pagamenti e titolare autonomo per la prevenzione
          delle frodi, l'antiriciclaggio e gli obblighi regolamentari a cui è
          soggetto; per questi trattamenti si applica l'informativa di Stripe
          (<a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            >stripe.com/privacy</a
          >).
        </li>
      </ul>

      <h2 id="section-6">6. Trasferimenti extra-UE</h2>
      <p>
        Alcuni fornitori hanno sede o infrastrutture negli Stati Uniti o fuori
        dallo Spazio economico europeo. I trasferimenti si basano sulla
        decisione di adeguatezza (EU-US Data Privacy Framework) o sulle Clausole
        Contrattuali Standard della Commissione europea (decisione 2021/914),
        artt. 45 e 46 GDPR:
      </p>
      <ul>
        <li>
          <strong>Vercel, Resend:</strong> Data Privacy Framework e Clausole
          Contrattuali Standard incluse nei rispettivi DPA.
        </li>
        <li>
          <strong>Supabase:</strong> dati a Francoforte; il soggetto
          contrattuale ha sede a Singapore ed è possibile un accesso di
          assistenza da fuori UE. Si applicano le Clausole Contrattuali Standard
          del DPA di Supabase.
        </li>
        <li>
          <strong>Google, Stripe:</strong> i trasferimenti verso le società
          statunitensi del gruppo si basano sul Data Privacy Framework e sulle
          Clausole Contrattuali Standard.
        </li>
      </ul>
      <p>
        Puoi richiedere una copia delle Clausole Contrattuali Standard scrivendo
        all'indirizzo indicato nella sezione 1.
      </p>

      <h2 id="section-7">7. Tempi di conservazione</h2>
      <div
        class="overflow-x-auto"
        role="region"
        tabindex="0"
        aria-labelledby="section-7"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Dato</th>
              <th scope="col">Conservazione</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account e dati della casa</td>
              <td>Finché l'account è attivo</td>
            </tr>
            <tr>
              <td>Account di cui è stata chiesta la cancellazione</td>
              <td>
                30 giorni di sospensione, poi pseudonimizzazione (sezione 9)
              </td>
            </tr>
            <tr>
              <td>Spese e dati finanziari storici delle case condivise</td>
              <td>
                Conservati in forma pseudonimizzata ("Utente eliminato") per
                mantenere coerenti i conti degli altri membri
              </td>
            </tr>
            <tr>
              <td>Fatture e documenti contabili</td>
              <td>10 anni (art. 2220 c.c. e normativa fiscale)</td>
            </tr>
            <tr>
              <td>Eventi di sicurezza (con IP pseudonimizzato)</td>
              <td>12 mesi</td>
            </tr>
            <tr>
              <td>Rate limiting (IP pseudonimizzato)</td>
              <td>2 ore</td>
            </tr>
            <tr>
              <td>Inviti</td>
              <td>
                L'email invitata è anonimizzata all'uso dell'invito; gli inviti
                scaduti e non usati sono eliminati
              </td>
            </tr>
            <tr>
              <td>Token di verifica email e di reset password</td>
              <td>
                Reset: validi 1 ora; i token scaduti o usati sono eliminati da
                un processo automatico giornaliero
              </td>
            </tr>
            <tr>
              <td>Cookie di sessione</td>
              <td>
                Accesso 15 minuti; rinnovo fino alla chiusura del browser o 7
                giorni con "ricordami" (dettagli nella
                <NuxtLink to="/cookies">Cookie Policy</NuxtLink>)
              </td>
            </tr>
            <tr>
              <td>Registro delle richieste privacy</td>
              <td>12 mesi dalla chiusura della richiesta</td>
            </tr>
            <tr>
              <td>Log tecnici dei fornitori</td>
              <td>
                Vercel: log di esecuzione 1 ora; Supabase: log API e database 1
                giorno; Resend: log e contenuto delle email 30 giorni
              </td>
            </tr>
            <tr>
              <td>Backup</td>
              <td>
                <!-- TODO: update when PITR / encrypted backups are enabled (finding F1) -->
                Al momento non sono attivi backup del database. Quando saranno
                attivati aggiorneremo questa informativa indicandone la durata.
              </td>
            </tr>
            <tr>
              <td>File e immagini caricati</td>
              <td>
                Il caricamento di file non è al momento attivo. Le immagini
                delle segnalazioni sono eliminate alla cancellazione
                dell'account.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="section-8">8. I tuoi diritti</h2>
      <p>
        Hai diritto di accesso (art. 15), rettifica (art. 16), cancellazione
        (art. 17), limitazione (art. 18), portabilità (art. 20) e opposizione al
        trattamento basato sul legittimo interesse (art. 21). Puoi esercitarli
        direttamente nell'app
        <LegalMailLink
          :email="LEGAL_ENTITY.privacyEmail"
          lead="oppure scrivendo a"
          fallback="oppure tramite le impostazioni privacy"
        />; rispondiamo entro un mese.
      </p>
      <div
        class="overflow-x-auto"
        role="region"
        tabindex="0"
        aria-labelledby="section-8"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Diritto</th>
              <th scope="col">Come esercitarlo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Accesso e portabilità</td>
              <td>
                Impostazioni › Privacy › Esporta i miei dati: scarichi un file
                JSON completo
              </td>
            </tr>
            <tr>
              <td>Rettifica</td>
              <td>Profilo: modifica i tuoi dati in qualsiasi momento</td>
            </tr>
            <tr>
              <td>Cancellazione</td>
              <td>Impostazioni › Privacy › Elimina account (vedi sezione 9)</td>
            </tr>
            <tr>
              <td>Revoca del consenso</td>
              <td>Impostazioni › Privacy › Condivisione del profilo</td>
            </tr>
            <tr>
              <td>Limitazione e opposizione</td>
              <td>Scrivi all'indirizzo email di cui sopra</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="section-9">9. Cancellazione dell'account</h2>
      <ol>
        <li>
          Richiedi la cancellazione da Impostazioni › Privacy. Se sei
          proprietario di una casa con altri membri devi prima trasferire la
          proprietà; le case di cui sei l'unico membro sono archiviate.
        </li>
        <li>
          Per 30 giorni l'account è sospeso: non sei visibile ai coinquilini,
          non ricevi email e puoi accedere solo per annullare la cancellazione o
          esportare i dati. Se annulli entro 30 giorni tutto viene ripristinato.
        </li>
        <li>
          Trascorsi 30 giorni i dati sono pseudonimizzati: note in bacheca,
          segnalazioni e immagini sono eliminate, le appartenenze alle case
          terminate, i dati identificativi rimossi e le spese condivise
          conservate in forma pseudonimizzata ("Utente eliminato"). Il cliente
          Stripe è anonimizzato; le fatture sono conservate per 10 anni per
          obbligo di legge.
        </li>
      </ol>

      <h2 id="section-10">10. Revoca del consenso</h2>
      <p>
        Puoi revocare il consenso alla condivisione del profilo in qualsiasi
        momento da Impostazioni › Privacy. La revoca elimina i campi facoltativi
        del profilo e non pregiudica la liceità del trattamento precedente.
      </p>

      <h2 id="section-11">11. Minori</h2>
      <p>
        Per creare un account devi avere almeno 14 anni (art. 2-quinquies Codice
        Privacy). Gli abbonamenti a pagamento sono riservati ai maggiorenni. Se
        scopriamo che un account appartiene a una persona sotto i 14 anni lo
        eliminiamo.
      </p>

      <h2 id="section-12">12. Sicurezza</h2>
      <p>
        Usiamo connessioni cifrate (TLS), password conservate solo come hash,
        cookie di sessione protetti (HttpOnly), controlli di accesso per casa,
        limitazione dei tentativi di accesso, pseudonimizzazione degli indirizzi
        IP nei registri di sicurezza e accesso ai sistemi limitato al
        necessario. In caso di violazione dei dati personali che presenti un
        rischio per te ti informeremo e notificheremo il Garante nei termini di
        legge (artt. 33 e 34 GDPR).
      </p>

      <h2 id="section-13">13. Reclamo all'autorità di controllo</h2>
      <p>
        Puoi proporre reclamo al
        <a
          href="https://www.garanteprivacy.it"
          target="_blank"
          rel="noopener noreferrer"
          >Garante per la protezione dei dati personali</a
        >
        o all'autorità del tuo Stato di residenza.
      </p>

      <h2 id="section-14">14. Processi decisionali automatizzati</h2>
      <p>
        Non svolgiamo decisioni basate unicamente su un trattamento
        automatizzato, inclusa la profilazione, che producano effetti giuridici
        sul tuo conto o incidano in modo analogo significativamente su di te
        (art. 22).
      </p>

      <h2 id="section-15">15. Cookie</h2>
      <p>
        House M8 usa solo cookie tecnici e di preferenza, nessuno di analisi o
        di terze parti. L'elenco completo è nella
        <NuxtLink to="/cookies">Cookie Policy</NuxtLink>.
      </p>

      <h2 id="section-16">16. Modifiche e versioni</h2>
      <p>
        Questa è la versione {{ LEGAL_POLICY_VERSION }}. In caso di modifiche
        rilevanti aggiorniamo il numero di versione, ti avvisiamo e ti chiediamo
        di prenderne visione al successivo accesso. Le correzioni formali non
        comportano un nuovo numero di versione.
      </p>
    </template>

    <template v-else>
      <h1>Privacy Policy</h1>
      <p>
        Notice under articles 13 and 14 of Regulation (EU) 2016/679 (GDPR).<br />
        <strong>Version {{ LEGAL_POLICY_VERSION }}</strong> — effective from
        TODO: effective date.<br />
        <strong>Last updated:</strong> {{ LEGAL_LAST_UPDATED }}
      </p>

      <h2 id="section-1">1. Data controller</h2>
      <p>
        The data controller is {{ LEGAL_ENTITY.name }} ({{
          LEGAL_ENTITY.legalForm
        }}), registered office at {{ LEGAL_ENTITY.address }}, VAT no.
        {{ LEGAL_ENTITY.vatNumber }}, REA {{ LEGAL_ENTITY.rea }}, PEC
        {{ LEGAL_ENTITY.pec }} ("the controller", "we"). For any privacy request
        <LegalMailLink
          :email="LEGAL_ENTITY.privacyEmail"
          lead="write to"
          fallback="use the privacy settings in the app"
        />. No Data Protection Officer (DPO) has been appointed, as none is
        required.
      </p>

      <h2 id="section-2">2. Data processed</h2>
      <ul>
        <li>
          <strong>Account:</strong> email, password (stored only as a hash),
          first and last name and avatar. Name and avatar are visible to your
          housemates; your email is never shown to other users. If you sign in
          with Google we receive your name and email; your Google account photo
          is not imported.
        </li>
        <li>
          <strong>Optional profile</strong> (only if you turn on profile
          sharing): gender, bio, occupation, study or job, languages spoken,
          pets, phone, social handles and profile pictures. We do not collect
          birthplace, nationality, birth date or smoking habit, and we do not
          process special categories of data (art. 9).
        </li>
        <li>
          <strong>Shared household data:</strong> house membership and role,
          invitations, expenses and shares, bills, reminders, bulletin notes,
          reports (including images) and monthly reports.
        </li>
        <li>
          <strong>Subscription and payments</strong> (paid plans): email, name,
          billing address and VAT number if you provide them, plan and
          subscription status, invoices. Card details are collected and stored
          directly by Stripe; we never see or store them.
        </li>
        <li>
          <strong>Consents and acceptances:</strong> the Terms version you
          accepted, your acknowledgement of this notice, your profile-sharing
          consent and, for paid plans, your request for immediate start of the
          service, each with date and version.
        </li>
        <li>
          <strong>Security events:</strong> successful and failed sign-ins,
          sign-up, password reset, data export, deletion request and
          cancellation, role and house-ownership changes, consent changes and
          subscription withdrawal. Each event records the date, the user and a
          pseudonymized IP address (HMAC with a secret key, not reversible by
          third parties).
        </li>
        <li>
          <strong>Rate limiting:</strong> pseudonymized IP address, kept for a
          short time.
        </li>
        <li>
          <strong>Transactional email:</strong> email address, name and message
          content (verification, password reset, invitations, reminders,
          reports, subscription and deletion confirmations).
        </li>
        <li>
          <strong>Technical data:</strong> infrastructure provider logs (for
          example IP address and request time) and the cookies described in the
          <NuxtLink to="/cookies">Cookie Policy</NuxtLink>.
        </li>
        <li>
          <strong>Privacy request log:</strong> a record of data export and
          deletion requests.
        </li>
      </ul>

      <h2 id="section-3">3. Purposes and legal bases</h2>
      <div
        class="overflow-x-auto"
        role="region"
        tabindex="0"
        aria-labelledby="section-3"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Purpose</th>
              <th scope="col">Legal basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Creating and managing your account, authenticating you,
                providing the shared-household features (expenses, bills,
                bulletin board, reports) and sending service emails
              </td>
              <td>Art. 6(1)(b) — performance of a contract</td>
            </tr>
            <tr>
              <td>Managing the paid subscription, invoicing and payments</td>
              <td>
                Art. 6(1)(b) — performance of a contract; art. 6(1)(c) — tax and
                accounting obligations
              </td>
            </tr>
            <tr>
              <td>
                Filling in the optional profile and showing it to housemates
              </td>
              <td>
                Art. 6(1)(a) — consent, withdrawable at any time in Settings ›
                Privacy
              </td>
            </tr>
            <tr>
              <td>
                Service security and abuse prevention (login attempt limiting,
                security events log)
              </td>
              <td>Art. 6(1)(f) — legitimate interest in security</td>
            </tr>
            <tr>
              <td>
                Technical and preference cookies (see the
                <NuxtLink to="/cookies">Cookie Policy</NuxtLink>)
              </td>
              <td>
                Art. 6(1)(f) — legitimate interest; art. 122 Italian Privacy
                Code (no consent needed for technical cookies)
              </td>
            </tr>
            <tr>
              <td>
                Handling rights requests and documenting account deletions
              </td>
              <td>
                Art. 6(1)(c) — legal obligation; art. 6(1)(f) — accountability
              </td>
            </tr>
            <tr>
              <td>
                Payment fraud prevention and anti-money-laundering (by Stripe,
                as independent controller)
              </td>
              <td>Art. 6(1)(c) and (f) — performed by Stripe, see section 5</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="section-4">4. Whether providing data is mandatory</h2>
      <p>
        Email, password (or Google sign-in), first and last name are required to
        create an account: without them we cannot provide the service. The
        optional profile is processed only with your consent; not turning it on
        does not limit the core features. For paid plans, billing data is needed
        to conclude the contract and meet tax obligations.
      </p>

      <h2 id="section-5">5. Recipients and processors</h2>
      <p>
        Data is not sold. It is shared with the providers below, who act as
        processors (art. 28) or, where stated, as independent controllers, and
        with the other members of your house:
      </p>
      <ul>
        <li>
          <strong>Housemates:</strong> they see your name and avatar and, if you
          turned on profile sharing, your optional profile fields; they never
          see your email. Expenses and financial data of the house are visible
          to the house members.
        </li>
        <li>
          <strong>Vercel Inc.</strong> (USA) — application hosting. Server
          functions run in the Dublin (EU) region; static content is served by
          the global CDN.
        </li>
        <li>
          <strong>Supabase</strong> (Supabase Pte. Ltd., Singapore) — database,
          hosted on AWS eu-central-1, Frankfurt (EU).
        </li>
        <li>
          <strong>Resend</strong> (Plus Five Five, Inc., USA) — transactional
          email delivery.
        </li>
        <li>
          <strong>Google Ireland Limited</strong> — only if you choose Google
          sign-in (OAuth).
        </li>
        <li>
          <strong>Stripe Payments Europe, Ltd.</strong> (Ireland) — subscription
          payments. It is our processor for executing payments and an
          independent controller for fraud prevention, anti-money-laundering and
          the regulatory duties it is subject to; for those, Stripe's privacy
          notice applies (<a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            >stripe.com/privacy</a
          >).
        </li>
      </ul>

      <h2 id="section-6">6. Transfers outside the EU</h2>
      <p>
        Some providers are based or have infrastructure in the United States or
        outside the European Economic Area. Transfers rely on the adequacy
        decision (EU-US Data Privacy Framework) or the European Commission's
        Standard Contractual Clauses (decision 2021/914), arts. 45 and 46 GDPR:
      </p>
      <ul>
        <li>
          <strong>Vercel, Resend:</strong> Data Privacy Framework and the
          Standard Contractual Clauses in their DPAs.
        </li>
        <li>
          <strong>Supabase:</strong> data is stored in Frankfurt; the
          contracting entity is in Singapore and support access from outside the
          EU is possible. The Standard Contractual Clauses in Supabase's DPA
          apply.
        </li>
        <li>
          <strong>Google, Stripe:</strong> transfers to the US group companies
          rely on the Data Privacy Framework and the Standard Contractual
          Clauses.
        </li>
      </ul>
      <p>
        You can request a copy of the Standard Contractual Clauses at the
        address in section 1.
      </p>

      <h2 id="section-7">7. Retention</h2>
      <div
        class="overflow-x-auto"
        role="region"
        tabindex="0"
        aria-labelledby="section-7"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Retention</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account and household data</td>
              <td>As long as the account is active</td>
            </tr>
            <tr>
              <td>Account with a deletion request</td>
              <td>30-day suspension, then pseudonymization (section 9)</td>
            </tr>
            <tr>
              <td>Historical expenses and financial data of shared houses</td>
              <td>
                Kept pseudonymized ("Deleted user") so the other members'
                balances stay correct
              </td>
            </tr>
            <tr>
              <td>Invoices and accounting records</td>
              <td>10 years (art. 2220 Italian Civil Code and tax law)</td>
            </tr>
            <tr>
              <td>Security events (pseudonymized IP)</td>
              <td>12 months</td>
            </tr>
            <tr>
              <td>Rate limiting (pseudonymized IP)</td>
              <td>2 hours</td>
            </tr>
            <tr>
              <td>Invitations</td>
              <td>
                The invited email is anonymized when the invitation is used;
                expired unused invitations are deleted
              </td>
            </tr>
            <tr>
              <td>Email verification and password reset tokens</td>
              <td>
                Reset tokens are valid 1 hour; expired or used tokens are
                deleted by a daily automatic job
              </td>
            </tr>
            <tr>
              <td>Session cookies</td>
              <td>
                Access token 15 minutes; renewal until the browser closes or 7
                days with "remember me" (details in the
                <NuxtLink to="/cookies">Cookie Policy</NuxtLink>)
              </td>
            </tr>
            <tr>
              <td>Privacy request log</td>
              <td>12 months after the request is closed</td>
            </tr>
            <tr>
              <td>Provider technical logs</td>
              <td>
                Vercel: runtime logs 1 hour; Supabase: API and database logs 1
                day; Resend: email logs and content 30 days
              </td>
            </tr>
            <tr>
              <td>Backups</td>
              <td>
                <!-- TODO: update when PITR / encrypted backups are enabled (finding F1) -->
                Database backups are not enabled at the moment. When they are,
                we will update this notice with their duration.
              </td>
            </tr>
            <tr>
              <td>Uploaded files and images</td>
              <td>
                File upload is not currently active. Report images are deleted
                when the account is deleted.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="section-8">8. Your rights</h2>
      <p>
        You have the right of access (art. 15), rectification (art. 16), erasure
        (art. 17), restriction (art. 18), portability (art. 20) and to object to
        processing based on legitimate interest (art. 21). You can exercise them
        directly in the app
        <LegalMailLink
          :email="LEGAL_ENTITY.privacyEmail"
          lead="or by writing to"
          fallback="or through the privacy settings"
        />; we reply within one month.
      </p>
      <div
        class="overflow-x-auto"
        role="region"
        tabindex="0"
        aria-labelledby="section-8"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Right</th>
              <th scope="col">How to exercise it</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Access and portability</td>
              <td>
                Settings › Privacy › Export my data: you download a complete
                JSON file
              </td>
            </tr>
            <tr>
              <td>Rectification</td>
              <td>Profile: edit your data at any time</td>
            </tr>
            <tr>
              <td>Erasure</td>
              <td>Settings › Privacy › Delete account (see section 9)</td>
            </tr>
            <tr>
              <td>Withdraw consent</td>
              <td>Settings › Privacy › Profile sharing</td>
            </tr>
            <tr>
              <td>Restriction and objection</td>
              <td>Write to the email address above</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="section-9">9. Account deletion</h2>
      <ol>
        <li>
          Request deletion in Settings › Privacy. If you own a house with other
          members you must transfer ownership first; houses where you are the
          only member are archived.
        </li>
        <li>
          For 30 days the account is suspended: you are hidden from housemates,
          you receive no emails and you can sign in only to cancel the deletion
          or export your data. If you cancel within 30 days everything is
          restored.
        </li>
        <li>
          After 30 days the data is pseudonymized: bulletin notes, reports and
          images are deleted, house memberships end, identifying data is removed
          and shared expenses are kept pseudonymized ("Deleted user"). The
          Stripe customer is redacted; invoices are kept for 10 years as
          required by law.
        </li>
      </ol>

      <h2 id="section-10">10. Withdrawing consent</h2>
      <p>
        You can withdraw your profile-sharing consent at any time in Settings ›
        Privacy. Withdrawal deletes the optional profile fields and does not
        affect the lawfulness of processing carried out before.
      </p>

      <h2 id="section-11">11. Minors</h2>
      <p>
        You must be at least 14 to create an account (art. 2-quinquies Italian
        Privacy Code). Paid subscriptions are reserved for adults. If we learn
        that an account belongs to someone under 14 we delete it.
      </p>

      <h2 id="section-12">12. Security</h2>
      <p>
        We use encrypted connections (TLS), passwords stored only as hashes,
        protected session cookies (HttpOnly), per-house access controls,
        login-attempt limiting, pseudonymized IP addresses in security logs and
        need-to-know access to systems. If a personal data breach presents a
        risk to you we will inform you and notify the Garante within the legal
        deadlines (arts. 33 and 34 GDPR).
      </p>

      <h2 id="section-13">13. Complaint to the supervisory authority</h2>
      <p>
        You may lodge a complaint with the
        <a
          href="https://www.garanteprivacy.it"
          target="_blank"
          rel="noopener noreferrer"
          >Italian Data Protection Authority (Garante)</a
        >
        or the authority of your country of residence.
      </p>

      <h2 id="section-14">14. Automated decision-making</h2>
      <p>
        We do not take decisions based solely on automated processing, including
        profiling, that produce legal effects concerning you or similarly
        significantly affect you (art. 22).
      </p>

      <h2 id="section-15">15. Cookies</h2>
      <p>
        House M8 uses only technical and preference cookies, none for analytics
        or from third parties. The full list is in the
        <NuxtLink to="/cookies">Cookie Policy</NuxtLink>.
      </p>

      <h2 id="section-16">16. Changes and versions</h2>
      <p>
        This is version {{ LEGAL_POLICY_VERSION }}. For material changes we
        update the version number, tell you, and ask you to acknowledge the new
        text at your next sign-in. Formal corrections do not change the version
        number.
      </p>
    </template>
  </div>
</template>
