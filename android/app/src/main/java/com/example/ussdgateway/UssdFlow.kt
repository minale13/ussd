package com.example.ussdgateway

/**
 * One bank's USSD send-money recipe: how a payout session is dialled, which
 * menu options the flow walks before the recipient and amount, and how a menu
 * or confirmation prompt is answered while the session is running.
 *
 * The registry mirrors the server's `src/utils/banks.ts` - same five canonical
 * codes, same labels - so a bank the admin console can toggle on is always a
 * bank this app can dial. Dialling builds
 * `<prefix>[*menuOption...]*<destination>*<amount>#`, which is byte-for-byte
 * what the gateway has always sent for Telebirr (`*806*...#`) and CBE Birr;
 * the three banks added alongside them contribute their published menu path so
 * the queued segments land on the right prompts even when the bank gates the
 * session behind its PIN first:
 *
 *  - Awash Mobile Wallet: `*901`, transfer is menu option 1 (awashbank.com).
 *  - Dashen Mobile Plus: `*996`, the official flow is login (1) - transfer (1)
 *    - within Dashen (3), then source account, recipient, amount, confirm.
 *  - BoA mobile banking: `*815`, transfer is menu option 1, same shape as the
 *    published `*code*1*account*amount#` shortcut.
 *
 * [menuReply] is the fallback for prompts a dialled path cannot pre-answer: a
 * PIN gate may consume the queued segments on some networks, and every flow
 * confirms after the amount. The rules are keyword-based and best-effort
 * against each bank's published flow; a prompt no rule matches is left alone
 * rather than guessed at, so a mismatch stalls visibly instead of typing a
 * wrong menu option into a live transfer.
 */
data class UssdFlow(
    /** Canonical bank code, matching the server registry. */
    val bank: String,
    /** Human label for the activity log. */
    val label: String,
    /** USSD code the gateway dials, e.g. `*901`. Null means the handset cannot run this bank yet. */
    val dialPrefix: String?,
    /** Menu selections dialled as extra `*N` segments between the prefix and the recipient. */
    val menuPath: List<String> = emptyList(),
    /** True when the flow must also drive menus/confirmations interactively (Awash, Dashen, Abyssinia). */
    val menuDriven: Boolean = false,
    /** Ordered `keyword -> reply` rules for [menuDriven] sessions; first match wins. */
    val menuRules: List<Pair<String, String>> = emptyList(),
) {
    /**
     * The full dial string for a payout, or null when this bank has no USSD
     * flow. The legacy two banks keep their exact historical shape: their
     * prefix already carries the trailing `#` the original client dialled.
     */
    fun dialCode(destination: String, amount: String): String? {
        val prefix = dialPrefix ?: return null
        return (listOf(prefix) + menuPath + listOf(destination, amount)).joinToString("*") + "#"
    }

    /**
     * The reply for a menu or confirmation prompt, or null when the caller
     * should fall through to the shared destination / amount handling (or
     * answer nothing at all). Only meaningful for [menuDriven] flows.
     *
     * Confirmations read the same way across the three banks - "press 1",
     * "insert 1", "reply 1" - so they are matched first, before the per-bank
     * menu rules, and always answered with `1`.
     */
    fun menuReply(lowerPrompt: String): String? {
        if (!menuDriven) return null
        if (CONFIRM_PHRASES.any(lowerPrompt::contains)) return "1"
        for ((needle, reply) in menuRules) {
            if (lowerPrompt.contains(needle)) return reply
        }
        return null
    }

    private companion object {
        val CONFIRM_PHRASES = listOf(
            "press 1", "reply 1", "send 1", "insert 1",
            "enter 1", "type 1", "select 1", "choose 1",
        )
    }
}


/**
 * The five banks the gateway routes a payout to, with the USSD flow of each.
 *
 * [get] resolves any stored or reported code - the claim response, the legacy
 * `channel` label, a crafted value - to a recipe, falling back to Telebirr
 * exactly like the server's `normalizeBank`, so an unknown bank can never dial
 * a prefix nobody validated.
 */
object UssdFlows {
    private val flows = listOf(
        // Legacy two: identical dials to what the gateway has always sent.
        UssdFlow("TELEBIRR", "Telebirr", BuildConfig.USSD_PREFIX),
        // The trailing '#' is intentional: the dial builder appends `*...` after
        // the prefix exactly as the original two-bank client did, so existing
        // installs keep sending the string they have always sent.
        UssdFlow("CBEBIRR", "CBE Birr", "*889#"),
        // Awash Mobile Wallet: *901, transfer is option 1 of the menu.
        UssdFlow(
            "AWASH",
            "Awash Bank",
            "*901",
            menuPath = listOf("1"),
            menuDriven = true,
            menuRules = listOf(
                "transfer" to "1",
                "send money" to "1",
                "login" to "1",
            ),
        ),
        // Dashen Mobile Plus: *996, official flow is login (1) - transfer (1) -
        // within Dashen (3); the source-account and confirmation replies come
        // from the published step list (dashenbanksc.com).
        UssdFlow(
            "DASHEN",
            "Dashen Bank",
            "*996",
            menuPath = listOf("1", "1", "3"),
            menuDriven = true,
            menuRules = listOf(
                "within dashen" to "3",
                "sending account" to "1",
                "source account" to "1",
                "account from" to "1",
                "insert small" to "s",
                "login" to "1",
                "transfer" to "1",
                "send money" to "1",
            ),
        ),
        // Bank of Abyssinia: *815, transfer is option 1 of the menu.
        UssdFlow(
            "ABYSSINIA",
            "Bank of Abyssinia",
            "*815",
            menuPath = listOf("1"),
            menuDriven = true,
            menuRules = listOf(
                "transfer" to "1",
                "send money" to "1",
                "login" to "1",
            ),
        ),
    )

    private val byBank = flows.associateBy { it.bank }

    /** The recipe for [bank]; an unknown or null code falls back to Telebirr. */
    fun get(bank: String?): UssdFlow = byBank[bank] ?: byBank.getValue("TELEBIRR")

    /** Human label for a bank code, for the activity log. */
    fun label(bank: String?): String = get(bank).label
}
