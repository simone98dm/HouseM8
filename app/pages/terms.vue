<script setup lang="ts">
// Size justification: LEGAL PROSE held once per locale (same reasoning as
// privacy.vue). DRAFT for lawyer review: every statement marked in the Worker
// Report must be confirmed before the draft banner (legal layout) is removed.
import { LEGAL_ENTITY, LEGAL_POLICY_VERSION } from '~/utils/legal/cookies';

definePageMeta({ layout: 'legal' });
const { locale, t } = useI18n();
const config = useRuntimeConfig();

useSeoMeta({
  title: t('seo.titles.terms'),
  ogTitle: `${t('seo.titles.terms')} | House M8`,
  description: t('seo.descriptions.terms'),
  ogDescription: t('seo.descriptions.terms'),
  ogUrl: `${config.public.baseUrl}/terms`,
});
</script>

<template>
  <div>
    <template v-if="locale === 'it'">
      <h1>Termini di Servizio</h1>
      <p>
        <strong>Versione {{ LEGAL_POLICY_VERSION }}</strong> — in vigore dal
        TODO: data di entrata in vigore.
      </p>

      <h2 id="section-1">1. Chi siamo</h2>
      <p>
        House M8 è fornito da {{ LEGAL_ENTITY.name }} ({{
          LEGAL_ENTITY.legalForm
        }}), con sede in {{ LEGAL_ENTITY.address }}, P.IVA
        {{ LEGAL_ENTITY.vatNumber }}, REA {{ LEGAL_ENTITY.rea }}, PEC
        {{ LEGAL_ENTITY.pec }},
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="email"
          fallback="contatto tramite le impostazioni privacy dell'app"
        />.
      </p>

      <h2 id="section-2">2. Il servizio</h2>
      <p>
        House M8 è una piattaforma per gestire la vita in una casa condivisa:
        spese e quote, bollette, bacheca, segnalazioni e report mensili. Esiste
        un piano gratuito e piani a pagamento con funzioni aggiuntive. I saldi
        sono calcolati a partire dai dati inseriti dagli utenti; House M8 non
        gestisce denaro né esegue pagamenti tra coinquilini.
      </p>

      <h2 id="section-3">3. Account ed età minima</h2>
      <p>
        Per creare un account devi avere almeno 14 anni e fornire informazioni
        veritiere. Gli abbonamenti a pagamento sono riservati a chi ha almeno 18
        anni. Sei responsabile della riservatezza delle tue credenziali e non
        devi condividerle con terzi. L'accettazione dei presenti Termini e la
        presa visione dell'<NuxtLink to="/privacy"
          >Informativa sulla privacy</NuxtLink
        >
        sono due passaggi distinti.
      </p>

      <h2 id="section-4">4. Piani, prezzi e IVA</h2>
      <p>
        I piani e i prezzi in vigore sono indicati nella pagina
        <NuxtLink to="/pricing">Prezzi</NuxtLink>. I prezzi mostrati al momento
        dell'acquisto comprendono l'IVA e le imposte applicabili. Il pagamento è
        gestito da Stripe Payments Europe, Ltd.; i dati della carta non sono
        conservati da noi.
      </p>

      <h2 id="section-5">5. Prova gratuita e rinnovo automatico</h2>
      <ul>
        <li>
          Alla prima sottoscrizione di un piano a pagamento è prevista una prova
          gratuita di 14 giorni. Durante la prova non ti viene addebitato nulla.
        </li>
        <li>
          Al termine della prova l'abbonamento diventa a pagamento e si rinnova
          automaticamente ogni mese o ogni anno, secondo il piano scelto, al
          prezzo indicato al momento dell'acquisto, finché non lo disdici.
        </li>
        <li>
          Ti inviamo una email di conferma su supporto durevole con piano,
          prezzo IVA inclusa, fine della prova e condizioni di rinnovo.
        </li>
        <li>
          Se modifichiamo il prezzo, ti avvisiamo con congruo anticipo (TODO:
          numero di giorni) prima del rinnovo successivo e puoi disdire prima
          che la modifica si applichi.
        </li>
      </ul>

      <h2 id="section-6">6. Come disdire</h2>
      <p>
        Puoi disdire in qualsiasi momento da Impostazioni › Abbonamento, con il
        pulsante "Recedi / Disdici l'abbonamento" (funzione di recesso). Durante
        la prova o nei primi 14 giorni l'abbonamento termina subito; negli altri
        casi resta attivo fino alla fine del periodo già pagato e non si
        rinnova. Riceverai una email di conferma. Dallo stesso menu puoi gestire
        carta e fatture tramite il portale Stripe.
      </p>

      <h2 id="section-7">7. Diritto di recesso</h2>
      <p>
        Se sei un consumatore hai diritto di recedere dal contratto entro 14
        giorni dalla sua conclusione, senza motivo e senza penali (artt. 52-59
        Codice del Consumo). Puoi farlo con la funzione indicata alla sezione 6
        o
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="scrivendo a"
          fallback="tramite le impostazioni privacy dell'app"
        />.
      </p>
      <p>
        Al momento dell'acquisto ti chiediamo di richiedere espressamente
        l'avvio immediato del servizio e di riconoscere che, una volta
        completamente eseguito il servizio, perdi il diritto di recesso (art.
        59, comma 1, Codice del Consumo). Se recedi dopo aver richiesto l'avvio
        immediato, quando il servizio non è ancora stato eseguito per intero,
        sei tenuto a pagare soltanto la parte di servizio già fornita fino al
        recesso (art. 57, comma 3). Rimborsiamo quanto dovuto entro 14 giorni
        dal recesso con lo stesso mezzo di pagamento.
      </p>

      <h2 id="section-8">8. Conformità del servizio</h2>
      <p>
        Hai i diritti previsti dalla legge per i contenuti e i servizi digitali
        (artt. 135-octies e seguenti Codice del Consumo): il servizio deve
        essere conforme a quanto descritto, funzionare come previsto e ricevere
        gli aggiornamenti necessari. In caso di difetto di conformità puoi
        chiedere il ripristino della conformità, una riduzione del prezzo o la
        risoluzione del contratto, nei casi e nei limiti di legge.
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="Scrivi a"
          fallback="Usa le impostazioni privacy dell'app"
        />.
      </p>

      <h2 id="section-9">9. Contenuti e comportamento dell'utente</h2>
      <ul>
        <li>
          I contenuti che inserisci (spese, note, segnalazioni, immagini)
          restano tuoi. Ci autorizzi solo a conservarli e mostrarli ai membri
          della tua casa per erogare il servizio.
        </li>
        <li>
          Sei responsabile dell'esattezza dei dati inseriti e di averne il
          diritto; non caricare contenuti illeciti, offensivi o che violino
          diritti di terzi.
        </li>
        <li>
          Non usare il servizio per attività illegali, né per eludere le misure
          di sicurezza o sovraccaricare i sistemi.
        </li>
      </ul>

      <h2 id="section-10">10. Responsabilità</h2>
      <p>
        Rispondiamo secondo la legge. Nessuna clausola dei presenti Termini
        esclude o limita la responsabilità per dolo o colpa grave, per danni
        alla persona o in ogni altro caso in cui la legge non lo consenta, in
        particolare nei confronti dei consumatori. Il servizio è uno strumento
        di organizzazione e non costituisce consulenza fiscale, legale o
        finanziaria.
      </p>

      <h2 id="section-11">11. Sospensione e cessazione</h2>
      <p>
        Puoi eliminare l'account in ogni momento da Impostazioni › Privacy (vedi
        l'<NuxtLink to="/privacy">Informativa sulla privacy</NuxtLink>
        per il periodo di 30 giorni). Possiamo sospendere o chiudere un account
        in caso di violazione grave dei Termini, previa comunicazione motivata
        quando possibile e salvo che la legge o ragioni di sicurezza richiedano
        un intervento immediato. Se chiudiamo l'account senza tua colpa,
        rimborsiamo la parte di abbonamento già pagata e non fruita.
      </p>

      <h2 id="section-12">12. Modifiche ai Termini</h2>
      <p>
        Possiamo modificare i Termini per giustificati motivi (ad esempio
        modifiche di legge o del servizio). Ti avvisiamo con almeno TODO: 30
        giorni di preavviso via email e nell'app, e ti chiediamo di accettare la
        nuova versione. Se non sei d'accordo puoi disdire l'abbonamento o
        eliminare l'account prima dell'entrata in vigore, senza costi.
      </p>

      <h2 id="section-13">13. Legge applicabile e foro</h2>
      <p>
        I Termini sono regolati dalla legge italiana, ferme le norme
        inderogabili del Paese in cui hai la residenza abituale. Se sei un
        consumatore, per ogni controversia è competente il giudice del luogo di
        tua residenza o domicilio (art. 66-bis Codice del Consumo).
      </p>

      <h2 id="section-14">14. Reclami e risoluzione extragiudiziale</h2>
      <p>
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="Scrivici prima a"
          fallback="Scrivici prima tramite le impostazioni privacy dell'app"
        />: cerchiamo di rispondere entro TODO: 30 giorni. I consumatori possono
        ricorrere anche agli organismi di risoluzione alternativa delle
        controversie (ADR) previsti dagli artt. 141 e seguenti del Codice del
        Consumo. TODO: indicare se il titolare aderisce a un organismo ADR e se
        sia ancora applicabile la piattaforma europea ODR.
      </p>
    </template>

    <template v-else>
      <h1>Terms of Service</h1>
      <p>
        <strong>Version {{ LEGAL_POLICY_VERSION }}</strong> — effective from
        TODO: effective date.
      </p>

      <h2 id="section-1">1. Who we are</h2>
      <p>
        House M8 is provided by {{ LEGAL_ENTITY.name }} ({{
          LEGAL_ENTITY.legalForm
        }}), registered office at {{ LEGAL_ENTITY.address }}, VAT no.
        {{ LEGAL_ENTITY.vatNumber }}, REA {{ LEGAL_ENTITY.rea }}, PEC
        {{ LEGAL_ENTITY.pec }},
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="email"
          fallback="contact via the privacy settings in the app"
        />.
      </p>

      <h2 id="section-2">2. The service</h2>
      <p>
        House M8 is a platform for running a shared household: expenses and
        shares, bills, bulletin board, reports and monthly reports. There is a
        free plan and paid plans with extra features. Balances are calculated
        from the data users enter; House M8 does not hold money or execute
        payments between housemates.
      </p>

      <h2 id="section-3">3. Account and minimum age</h2>
      <p>
        To create an account you must be at least 14 and provide truthful
        information. Paid subscriptions are reserved for people aged 18 or over.
        You are responsible for keeping your credentials confidential and must
        not share them. Accepting these Terms and acknowledging the
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink> are two separate
        steps.
      </p>

      <h2 id="section-4">4. Plans, prices and VAT</h2>
      <p>
        Current plans and prices are shown on the
        <NuxtLink to="/pricing">Pricing</NuxtLink> page. Prices shown at
        purchase include VAT and any applicable taxes. Payment is handled by
        Stripe Payments Europe, Ltd.; we do not store your card details.
      </p>

      <h2 id="section-5">5. Free trial and automatic renewal</h2>
      <ul>
        <li>
          Your first subscription to a paid plan includes a 14-day free trial.
          You are not charged during the trial.
        </li>
        <li>
          When the trial ends the subscription becomes paid and renews
          automatically every month or year, depending on the plan, at the price
          shown at purchase, until you cancel.
        </li>
        <li>
          We send you a confirmation email on a durable medium with the plan,
          VAT-inclusive price, trial end and renewal terms.
        </li>
        <li>
          If we change the price, we notify you in advance (TODO: number of
          days) of the next renewal and you may cancel before the change
          applies.
        </li>
      </ul>

      <h2 id="section-6">6. How to cancel</h2>
      <p>
        You can cancel at any time in Settings › Subscription with the "Withdraw
        / Cancel subscription" button (the withdrawal function). During the
        trial or in the first 14 days the subscription ends immediately;
        otherwise it stays active until the end of the period already paid for
        and does not renew. You receive a confirmation email. From the same page
        you can manage your card and invoices through the Stripe portal.
      </p>

      <h2 id="section-7">7. Right of withdrawal</h2>
      <p>
        If you are a consumer you may withdraw from the contract within 14 days
        of its conclusion, without giving a reason and without penalty (arts.
        52-59 Italian Consumer Code). You can do so with the function described
        in section 6 or by
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="writing to"
          fallback="through the privacy settings in the app"
        />.
      </p>
      <p>
        At purchase we ask you to expressly request that the service starts
        immediately and to acknowledge that, once the service has been fully
        performed, you lose the right of withdrawal (art. 59(1) Italian Consumer
        Code). If you withdraw after requesting immediate start, while the
        service has not yet been fully performed, you only pay for the part of
        the service already provided up to withdrawal (art. 57(3)). We refund
        what is due within 14 days of withdrawal using the same payment method.
      </p>

      <h2 id="section-8">8. Conformity of the service</h2>
      <p>
        You have the legal rights for digital content and digital services
        (arts. 135-octies ff. Italian Consumer Code): the service must conform
        to its description, work as intended and receive necessary updates. If
        it does not conform you may ask for it to be brought into conformity, a
        price reduction or termination of the contract, as and within the limits
        set by law.
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="Write to"
          fallback="Use the privacy settings in the app"
        />.
      </p>

      <h2 id="section-9">9. User content and conduct</h2>
      <ul>
        <li>
          The content you enter (expenses, notes, reports, images) remains
          yours. You only authorize us to store it and show it to the members of
          your house to provide the service.
        </li>
        <li>
          You are responsible for the accuracy of the data you enter and for
          having the right to enter it; do not upload unlawful or offensive
          content or content that infringes third-party rights.
        </li>
        <li>
          Do not use the service for illegal activity, to bypass security
          measures or to overload the systems.
        </li>
      </ul>

      <h2 id="section-10">10. Liability</h2>
      <p>
        We are liable as provided by law. Nothing in these Terms excludes or
        limits liability for wilful misconduct or gross negligence, for personal
        injury, or in any other case where the law does not allow it, in
        particular towards consumers. The service is an organization tool and is
        not tax, legal or financial advice.
      </p>

      <h2 id="section-11">11. Suspension and termination</h2>
      <p>
        You can delete your account at any time in Settings › Privacy (see the
        <NuxtLink to="/privacy">Privacy Policy</NuxtLink> for the 30-day
        period). We may suspend or close an account for serious breach of the
        Terms, with a reasoned notice where possible, unless the law or security
        reasons require immediate action. If we close your account through no
        fault of yours, we refund the part of the subscription already paid and
        not used.
      </p>

      <h2 id="section-12">12. Changes to the Terms</h2>
      <p>
        We may change the Terms for justified reasons (for example changes in
        law or in the service). We give you at least TODO: 30 days' notice by
        email and in the app, and ask you to accept the new version. If you
        disagree you can cancel the subscription or delete the account before it
        takes effect, at no cost.
      </p>

      <h2 id="section-13">13. Governing law and courts</h2>
      <p>
        The Terms are governed by Italian law, without prejudice to the
        mandatory rules of the country where you habitually reside. If you are a
        consumer, the court of your place of residence or domicile has
        jurisdiction over any dispute (art. 66-bis Italian Consumer Code).
      </p>

      <h2 id="section-14">14. Complaints and out-of-court resolution</h2>
      <p>
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="Please write to us first at"
          fallback="Please contact us first via the privacy settings in the app"
        />: we aim to reply within TODO: 30 days. Consumers may also use the
        alternative dispute resolution (ADR) bodies provided for by arts. 141
        ff. of the Italian Consumer Code. TODO: state whether the provider
        adheres to an ADR body and whether the EU ODR platform still applies.
      </p>
    </template>
  </div>
</template>
