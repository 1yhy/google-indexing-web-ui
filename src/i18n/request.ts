import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, timeZone, dateTimeFormats } from "./index";

export default getRequestConfig(async ({ locale }) => {
  // validate language parameter
  if (!locales.includes(locale as any)) {
    notFound();
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone,
    locale: locale,
    now: new Date(),
    defaultTranslationValues: {
      strong: (chunks) => `<strong>${chunks}</strong>`,
    },
    formats: {
      dateTime: dateTimeFormats,
      number: {
        precise: {
          maximumFractionDigits: 2,
        },
      },
    },
    onError(error) {
      if (error.code === "MISSING_MESSAGE") {
        console.warn(error.message);
      } else {
        console.error(error);
      }
    },
  };
});
