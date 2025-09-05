export const formatDate = (d) =>
  typeof d === "string" ? d : new Date(d).toLocaleDateString();

export const currency = (v) => 
  new Intl.NumberFormat("fr-DZ", { style: "currency", currency: "DZD" }).format(Number(v || 0));
