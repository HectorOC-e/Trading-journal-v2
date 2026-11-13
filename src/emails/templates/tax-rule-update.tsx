import React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import type { RuleChange } from "@/server/services/tax/rules/publication-policy";

export interface TaxRuleUpdateEmailProps {
  year: number;
  agreement: string;
  sourceUrl: string;
  changes: RuleChange[];
  appUrl: string;
}
export function ruleAmount(value: string | null): string {
  if (value === null) return "Sin referencia anterior";
  const [whole, fraction] = value.split(".");
  return (
    "L " +
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    (fraction ? "." + fraction : "")
  );
}
export function TaxRuleUpdateEmail({
  year,
  agreement,
  sourceUrl,
  changes,
  appUrl,
}: TaxRuleUpdateEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{`Reglas ISR ${year} actualizadas en TjournalX`}</Preview>
      <Body
        style={{
          backgroundColor: "#f1f5fb",
          fontFamily: "Arial, sans-serif",
          color: "#263247",
        }}
      >
        <Container
          style={{
            maxWidth: 600,
            margin: "30px auto",
            backgroundColor: "#ffffff",
            padding: 30,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "#2f61d8",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            TJOURNALX · FISCALIDAD
          </Text>
          <Heading as="h1" style={{ fontSize: 25, color: "#112445" }}>
            Reglas ISR {year} actualizadas
          </Heading>
          <Text>
            Se incorporó una tabla verificada del SAR para el ejercicio fiscal{" "}
            {year}. La aplicación seleccionará las reglas correspondientes al
            ejercicio consultado.
          </Text>
          {changes.length ? (
            changes.map((change) => (
              <Text key={change.label}>
                <strong>{change.label}</strong>
                <br />
                {ruleAmount(change.before)} → {ruleAmount(change.after)}
              </Text>
            ))
          ) : (
            <Text>
              La tabla de este ejercicio está disponible. Sus umbrales coinciden
              con los de la referencia comparada.
            </Text>
          )}
          <Text>
            <strong>Referencia oficial:</strong> {agreement}
            <br />
            <Link href={sourceUrl}>Consultar publicación del SAR</Link>
          </Text>
          <Text>
            <Link
              href={
                new URL(`/fiscal?rulesYear=${year}#reglas-fiscales`, appUrl)
                  .href
              }
              style={{ color: "#2f61d8", fontWeight: 700 }}
            >
              Ver reglas y cambios en Fiscalidad
            </Link>
          </Text>
          <Hr style={{ borderColor: "#d9e2ef" }} />
          <Text style={{ fontSize: 13, color: "#5c6d84" }}>
            Los años anteriores y las declaraciones archivadas conservan su
            versión. La clasificación de ingresos, deducciones y otros criterios
            particulares sigue requiriendo su revisión. Este aviso no presenta
            una declaración ante el SAR.
          </Text>
          <Text style={{ fontSize: 12, color: "#5c6d84" }}>
            Puedes cambiar la recepción de estos correos en{" "}
            <Link href={new URL("/perfil", appUrl).href}>
              Perfil → Notificaciones → Email · Fiscalidad
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
