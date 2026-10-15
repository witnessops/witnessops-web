/**
 * Design question 12, recommended answer: keep negated limitation statements.
 * Phrases such as "this is not a penetration test" and "does not certify"
 * are the public boundary, so they stay. A positive certification,
 * compliance, or guarantee claim is still prohibited.
 */
export const NEGATED_LIMITATION_STATEMENTS_ARE_EXEMPT = true;
