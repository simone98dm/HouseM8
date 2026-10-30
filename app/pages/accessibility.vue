<script setup lang="ts">
// LEGAL PROSE (EAA accessibility statement), one block per locale, built from
// docs/legal/accessibility-statement.md. DRAFT: every TODO needs the real
// evaluation result before publication.
import { LEGAL_ENTITY } from '~/utils/legal/cookies';

definePageMeta({ layout: 'legal' });
const { locale, t } = useI18n();
const config = useRuntimeConfig();

useSeoMeta({
  title: t('seo.titles.accessibility'),
  ogTitle: `${t('seo.titles.accessibility')} | House M8`,
  description: t('seo.descriptions.accessibility'),
  ogDescription: t('seo.descriptions.accessibility'),
  ogUrl: `${config.public.baseUrl}/accessibility`,
});
</script>

<template>
  <div>
    <template v-if="locale === 'it'">
      <h1>Dichiarazione di accessibilità</h1>
      <p>
        {{ LEGAL_ENTITY.name }} si impegna a rendere accessibile il percorso di
        abbonamento e pagamento di House M8, in conformità all'European
        Accessibility Act (direttiva 2019/882), al D.Lgs. 82/2022 e alle WCAG
        2.2 livello AA (EN 301 549).
      </p>

      <h2 id="section-1">Ambito</h2>
      <p>
        Pagina prezzi, accesso e registrazione, impostazioni dell'account e
        gestione dell'abbonamento, e pagina di pagamento ospitata da Stripe
        raggiungibile da queste.
      </p>

      <h2 id="section-2">Stato di conformità</h2>
      <p>
        TODO: conforme / parzialmente conforme / non conforme. Data di
        valutazione: TODO. Metodo: autovalutazione, test automatici e verifica
        manuale con tastiera e screen reader (TODO: strumenti). Valutatore:
        TODO.
      </p>

      <h2 id="section-3">Limitazioni note</h2>
      <p>
        TODO dall'esito della valutazione. Le pagine di pagamento di Stripe sono
        fornite da Stripe: si applica la sua dichiarazione di accessibilità.
      </p>

      <h2 id="section-4">Contenuti non accessibili</h2>
      <p>
        TODO. In alternativa scrivici e ti aiuteremo a sottoscrivere o disdire
        l'abbonamento via email.
      </p>

      <h2 id="section-5">Feedback e contatti</h2>
      <p>
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="Segnala eventuali barriere a"
          fallback="Segnala eventuali barriere tramite le impostazioni privacy dell'app"
        />. Rispondiamo entro TODO: 10 giorni lavorativi.
      </p>

      <h2 id="section-6">Procedura di attuazione</h2>
      <p>
        Se la risposta non è soddisfacente puoi rivolgerti all'<a
          href="https://www.agid.gov.it"
          target="_blank"
          rel="noopener noreferrer"
          >Agenzia per l'Italia Digitale (AgID)</a
        >. TODO: verificare autorità e procedura competenti per i servizi
        privati.
      </p>

      <h2 id="section-7">Redazione</h2>
      <p>Dichiarazione redatta il TODO e riesaminata il TODO.</p>
    </template>

    <template v-else>
      <h1>Accessibility statement</h1>
      <p>
        {{ LEGAL_ENTITY.name }} is committed to making the House M8 subscription
        and checkout flow accessible, in line with the European Accessibility
        Act (Directive 2019/882), Legislative Decree 82/2022 and WCAG 2.2 level
        AA (EN 301 549).
      </p>

      <h2 id="section-1">Scope</h2>
      <p>
        Pricing page, sign-in and sign-up, account settings and subscription
        management, and the Stripe-hosted payment page reached from them.
      </p>

      <h2 id="section-2">Conformance status</h2>
      <p>
        TODO: fully / partially / not conforming. Evaluation date: TODO. Method:
        self-assessment, automated tests and manual keyboard and screen reader
        checks (TODO: tools). Evaluator: TODO.
      </p>

      <h2 id="section-3">Known limitations</h2>
      <p>
        TODO from the evaluation. Stripe payment pages are provided by Stripe,
        whose accessibility statement applies.
      </p>

      <h2 id="section-4">Non-accessible content</h2>
      <p>
        TODO. As an alternative, contact us and we will help you subscribe or
        cancel by email.
      </p>

      <h2 id="section-5">Feedback and contact</h2>
      <p>
        <LegalMailLink
          :email="LEGAL_ENTITY.supportEmail"
          lead="Report barriers at"
          fallback="Report barriers via the privacy settings in the app"
        />. We aim to reply within TODO: 10 working days.
      </p>

      <h2 id="section-6">Enforcement</h2>
      <p>
        If our reply is unsatisfactory you may contact the
        <a
          href="https://www.agid.gov.it"
          target="_blank"
          rel="noopener noreferrer"
          >Agenzia per l'Italia Digitale (AgID)</a
        >. TODO: verify the competent authority and procedure for private
        services.
      </p>

      <h2 id="section-7">Preparation</h2>
      <p>This statement was prepared on TODO and last reviewed on TODO.</p>
    </template>
  </div>
</template>
