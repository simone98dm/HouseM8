/**
 * useBillDetails composable
 * Provides utility functions for bill details calculations and formatting
 */

export const useBillDetails = () => {
  const { t: $t } = useI18n();
  const { formatShort } = useDate();

  const formatDate = (dateString: string) =>
    formatShort(dateString, { weekday: true });

  // Signed: negative means overdue. The only production caller is
  // BasicInfo.vue, which needs the sign to render an overdue bill distinctly
  // from one due today (bill/Card.vue computes its own signed diff locally
  // and was already correct).
  const getDaysUntilDue = (nextDueDate: string) => {
    const now = new Date();
    const dueDate = new Date(nextDueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDayOfMonth = (nextDueDate: string) => {
    const date = new Date(nextDueDate);
    return date.getDate();
  };

  const getContractDuration = (createdAt: string) => {
    const now = new Date();
    const startDate = new Date(createdAt);
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Was returning hardcoded English with English pluralisation rules, so an
    // Italian user read "22 days" / "3 months" inside otherwise translated copy.
    if (diffDays < 30) {
      return $t('bills.duration.days', diffDays);
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return $t('bills.duration.months', months);
    } else {
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      return `${$t('bills.duration.years', years)}, ${$t('bills.duration.months', months)}`;
    }
  };

  const getTotalPayments = (createdAt: string) => {
    const startDate = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    return Math.max(1, diffMonths);
  };

  const getTotalAmountPaid = (createdAt: string, monthlyCost: number) => {
    return getTotalPayments(createdAt) * monthlyCost;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'heroicons:document-text';
      case 'doc':
      case 'docx':
        return 'heroicons:document';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'heroicons:photo';
      default:
        return 'heroicons:document';
    }
  };

  const getCostPeriodLabel = (paymentPeriod: number) => {
    return $t(`bills.details.costPeriods.${paymentPeriod}`);
  };

  const getTotalCostLabel = (paymentPeriod: number) => {
    if (paymentPeriod === 1) return $t('bills.details.annualCost');
    if (paymentPeriod === 2) return $t('bills.details.semiAnnualCost');
    if (paymentPeriod === 6) return $t('bills.details.biAnnualCost');
    return $t('bills.details.totalCost');
  };

  const calculateTotalCost = (monthlyCost: number, paymentPeriod: number) => {
    // For monthly bills, show annual cost (12 months)
    if (paymentPeriod === 1) return monthlyCost * 12;
    // For bi-monthly, show semi-annual cost (6 months)
    if (paymentPeriod === 2) return monthlyCost * 6;
    // For semi-annual, show annual cost (2 payments)
    if (paymentPeriod === 6) return monthlyCost * 2;
    // For annual, just show the cost (1 payment)
    return monthlyCost;
  };

  const getPeriodLabel = (paymentPeriod: number) => {
    if (paymentPeriod === 1) return $t('bills.details.perYear');
    if (paymentPeriod === 2) return $t('bills.details.perSixMonths');
    if (paymentPeriod === 6) return $t('bills.details.perSixMonths');
    return $t('bills.details.perYear');
  };

  return {
    formatDate,
    getDaysUntilDue,
    getDayOfMonth,
    getContractDuration,
    getTotalPayments,
    getTotalAmountPaid,
    getFileIcon,
    getCostPeriodLabel,
    getTotalCostLabel,
    calculateTotalCost,
    getPeriodLabel,
  };
};
