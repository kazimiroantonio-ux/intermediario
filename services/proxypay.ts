interface CreateReferenceParams {
  paymentId?: string;
  amountInKz: number;
}

interface ProxyPayReference {
  entity: string;
  referenceCode: string;
  expiryDate: Date;
}

const REFERENCE_TTL_HOURS = 48;

export const ProxyPayService = {
  /**
   * Gera uma referência de pagamento Multicaixa Express.
   * Em produção: chamar a API da ProxyPay/EMIS (token autenticado)
   * para obter entity + referência + validade reais.
   */
  async createReference({ paymentId, amountInKz }: CreateReferenceParams): Promise<ProxyPayReference> {
    const entity = process.env.MULTICAIXA_ENTITY || "12345";
    const referenceCode = String(Math.floor(100000000 + Math.random() * 900000000));
    const expiryDate = new Date(Date.now() + REFERENCE_TTL_HOURS * 60 * 60 * 1000);
    return { entity, referenceCode, expiryDate };
  },
};