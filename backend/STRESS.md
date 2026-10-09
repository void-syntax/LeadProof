# Stress set: 10 hard holdout calls

The main 40 calls were written together with the prompt, so 40/40 there proves less than it looks.
These 10 calls were written after the prompt was frozen, to attack its weak spots. The prompt is not tuned on them:
we run them once and publish whatever comes out, including failures.

Run: `python test_run.py --stress` → `data/stress_report.json` (also served at `GET /stress`).

| Call | Lang | What is hard | Expected actions |
| --- | --- | --- | --- |
| S-01 | mixed | The 10% is said by the CLIENT: attributing it to the manager gives a false CORRECT_PROMISE | OK |
| S-02 | az | Number in Azerbaijani words: if the value comes back as 'iyirmi', the code cannot read it and misses the violation | CORRECT_PROMISE |
| S-03 | az | Relative date in Azerbaijani: the model must compute the quarter from the call date | CORRECT_PROMISE, INVITE_SHOWROOM |
| S-04 | ru | Garbled project name and garbled word for discount | CORRECT_PROMISE |
| S-05 | az | Script the prompt does not mention: Azerbaijani in Cyrillic | CORRECT_PROMISE |
| S-06 | mixed | One line holds a violating and a compliant promise; only the installment must be flagged | CORRECT_PROMISE, INVITE_SHOWROOM |
| S-07 | az | Long context: hedged statement must be ignored, the definite one must be caught | CORRECT_PROMISE |
| S-08 | az | The guarantee words appear in the call, but nobody from our side promised anything | CALLBACK_TODAY, COACHING |
| S-09 | ru | Known limitation: the agent trusts speaker labels, so a mislabeled manager promise is likely missed **(known limitation)** | CORRECT_PROMISE |
| S-10 | az | Number in words: if the value comes back as 'üç', the code reports a discount without a percentage (false alarm) | OK |

## Transcripts

### S-01: Client quotes a 10% discount from an ad; manager corrects it to the allowed 3% for full payment

- `00:03` **manager**: Salam, Demo Residence, mənim adım Nərmin. Sizə necə kömək edə bilərəm?
- `00:10` **client**: Salam. В Инстаграме писали, что у вас скидка 10%. Это правда?
- `00:16` **manager**: Xeyr, maksimum 3% endirim var, yalnız 100% ödənişdə.
- `00:21` **manager**: Büdcəniz nə qədərdir?
- `00:25` **client**: Təxminən 130 min, nağd ödəyəcəyəm.
- `00:29` **manager**: Neçə otaqlı axtarırsınız, özünüz üçün, yoxsa investisiya?
- `00:35` **client**: İki otaqlı, özümüz yaşamaq üçün.
- `00:39` **manager**: Şənbə saat 11-də şouruma gəlin, mənzilləri göstərim.
- `00:44` **client**: Yaxşı, şənbə 11-də gələcəm.

### S-02: Down payment 20% said in words (below the 30% minimum); 'two years' installment is compliant

- `00:03` **manager**: Salam, Demo Residence, Elvin danışır.
- `00:07` **client**: Salam, üç otaqlı mənzil üçün zəng edirəm, ailəmlə yaşamaq üçün.
- `00:14` **manager**: Büdcəniz nə qədərdir?
- `00:18` **client**: Yüz səksən min manat.
- `00:22` **manager**: Necə ödəmək istəyirsiniz?
- `00:26` **client**: Hissə-hissə ödəmək istəyirəm.
- `00:30` **manager**: Problem yoxdur, ilkin ödəniş cəmi iyirmi faizdir, qalanını iki ilə.
- `00:37` **manager**: Bazar ertəsi saat 15:00-da şouruma gələ bilərsiniz?
- `00:42` **client**: Bəli, bazar ertəsi 15-də gəlirəm.

### S-03: Handover 'second quarter of next year' = 2027-04, earlier than the declared 2027-10; no showroom invite

- `00:03` **manager**: Salam, mən Səbinə, Demo Residence satış şöbəsi.
- `00:08` **client**: Salam. Bir otaqlı mənzil axtarıram, investisiya üçün. Təhvil nə vaxtdır?
- `00:16` **manager**: Təhvil gələn ilin ikinci rübündədir.
- `00:20` **manager**: Büdcəniz nə qədərdir?
- `00:24` **client**: Doxsan min, ipoteka ilə alacağam.
- `00:28` **manager**: Sabah saat 17-də sizə planları göndərim?
- `00:32` **client**: Bəli, göndərin, baxaram.

### S-04: Russian transliterated into Latin with ASR errors ('demo rezidens', 'skitku'); 5% discount exceeds the 3% maximum

- `00:03` **manager**: Dobryy den, demo rezidens, menya zovut Rashad.
- `00:08` **client**: Zdravstvuyte, dvushku khotim, dlya sebya zhit.
- `00:13` **manager**: Kakoy u vas byudzhet?
- `00:17` **client**: Nu tysyach sto sorok gde-to.
- `00:21` **manager**: Oplata kak budet?
- `00:25` **client**: Nalichnymi, srazu vsyo.
- `00:29` **manager**: Yesli srazu vsyo oplatite, skitku pyat protsentov sdelaem.
- `00:35` **manager**: V subbotu v dva prikhodite v shourum?
- `00:39` **client**: Da, v subbotu v dva budem.

### S-05: Azerbaijani written in Cyrillic (ASR setting); price 1,900 AZN per m2 is below the 2,000 minimum

- `00:03` **manager**: Салам, Демо Резиденс, мәним адым Елнур.
- `00:07` **client**: Салам. Ики отаглы мәнзил истәјирәм, өзүм јашамаг үчүн.
- `00:13` **manager**: Бүдҹәниз нә гәдәрдир?
- `00:17` **client**: Јүз ијирми мин.
- `00:21` **manager**: Квадрат метри 1 900 манатдан башлајыр.
- `00:25` **client**: Јахшы. Нағд өдәјәҹәм.
- `00:29` **manager**: Ҹүмә ахшамы саат 16-да шоуруму көрмәјә кәлин.
- `00:34` **client**: Олар, кәләрәм.

### S-06: Two promises in one sentence: 36-month installment (violation) and 30% down payment (compliant); showroom without a time

- `00:03` **manager**: Здравствуйте, Demo Residence, меня зовут Фарид.
- `00:08` **client**: Salam, üç otaqlı mənzil axtarırıq, ailəmizlə yaşamaq üçün.
- `00:14` **manager**: Büdcəniz və ödəniş üsulu necədir?
- `00:18` **client**: 200 min, hissə-hissə ödəyəcəyik.
- `00:22` **manager**: Отлично, рассрочка на 36 месяцев, первый взнос 30%.
- `00:27` **manager**: Sabah saat 12-də sizə zəng edim, şourum üçün vaxt təyin edək?
- `00:33` **client**: Oldu, sabah 12-də gözləyirəm.

### S-07: Long call: an allowed hedged remark early ('ola bilər'), a guaranteed 10% price growth buried near the end

- `00:03` **manager**: Salam, Demo Residence, mənim adım Kamran.
- `00:07` **client**: Salam, sizin layihə haqqında bir neçə sualım var.
- `00:12` **manager**: Buyurun, qulağım sizdədir.
- `00:16` **client**: Yaxınlıqda məktəb var?
- `00:20` **manager**: Bəli, iki yüz metr aralıda məktəb və uşaq bağçası var.
- `00:26` **client**: Metro nə qədər uzaqdır?
- `00:30` **manager**: Piyada on dəqiqə.
- `00:34` **client**: Parkinq var?
- `00:38` **manager**: Yeraltı parkinq var, hər mənzilə bir yer düşür.
- `00:43` **client**: Binalar neçə mərtəbəlidir?
- `00:47` **manager**: On altı mərtəbə, monolit karkas.
- `00:51` **client**: Qiymətlər artacaq?
- `00:55` **manager**: Ola bilər, bazardan asılıdır.
- `00:59` **manager**: Siz neçə otaqlı baxırsınız və nə üçün?
- `01:03` **client**: Üç otaqlı, özümüz yaşamaq üçün.
- `01:07` **manager**: Büdcəniz nə qədərdir?
- `01:11` **client**: Təxminən iki yüz min.
- `01:15` **manager**: Ödənişi necə edəcəksiniz?
- `01:19` **client**: İpoteka ilə.
- `01:23` **client**: Dənizə baxan mənzillər qalıb?
- `01:27` **manager**: Bir neçə dənə qalıb, onuncu mərtəbədən yuxarı.
- `01:32` **manager**: Amma bunu deyim: yanvardan qiymət mütləq 10% artacaq, indi almaq sərfəlidir.
- `01:40` **client**: Başa düşdüm.
- `01:44` **manager**: Cümə günü saat 15-də şouruma gəlin, dəniz mənzərəli mənzilləri göstərim.
- `01:52` **client**: Yaxşı, cümə 15-də gələcəm.
- `01:56` **manager**: Gözləyirəm, sağ olun.

### S-08: Client repeats a competitor's 'price will surely grow 20%'; manager explicitly refuses to guarantee it

- `00:03` **manager**: Salam, Demo Residence, Aysel danışır.
- `00:07` **client**: Salam. Qonşu layihədə deyirlər ki, qiymət gələn il mütləq 20% artacaq. Sizdə də belədir?
- `00:16` **manager**: Rəqiblər belə deyir, amma biz qiymət artımına zəmanət vermirik. Bazar dəyişə bilər.
- `00:25` **manager**: Neçə otaqlı baxırsınız, nə üçün?
- `00:29` **client**: İki otaqlı, investisiya üçün.
- `00:33` **manager**: Büdcəniz nə qədərdir?
- `00:37` **client**: Hələ demək istəmirəm.
- `00:41` **manager**: Ödənişi necə planlaşdırırsınız?
- `00:45` **client**: Yoldaşımla danışmalıyam, sonra deyərəm.
- `00:49` **manager**: Cümə saat 18-də yoldaşınızla birlikdə şouruma gəlin.
- `00:54` **client**: Bilmirəm, fikirləşərəm.

### S-09: Speaker labels swapped by the telephony: the manager's 7% discount line is tagged as client

- `00:03` **manager**: Добрый день, Demo Residence, меня зовут Ильгар.
- `00:08` **client**: Здравствуйте, интересует однушка под сдачу.
- `00:12` **manager**: Какой у вас бюджет и как планируете оплачивать?
- `00:17` **client**: Около 90 тысяч, наличными.
- `00:21` **client**: При полной оплате дадим скидку 7%, это только для вас.
- `00:27` **client**: Хорошо, звучит отлично.
- `00:31` **manager**: Приходите в шоурум завтра в 11?
- `00:35` **client**: Да, завтра в 11 буду.

### S-10: Compliant 3% discount for full payment, said in words ('üç faiz')

- `00:03` **manager**: Salam, Demo Residence, mənim adım Rəşad.
- `00:07` **client**: Salam, iki otaqlı mənzil istəyirəm, özüm yaşamaq üçün.
- `00:13` **manager**: Büdcəniz nə qədərdir?
- `00:17` **client**: Yüz qırx min, nağd.
- `00:21` **manager**: Tam ödənişdə sizə üç faiz endirim edə bilərik.
- `00:26` **manager**: Çərşənbə günü saat 14-də şouruma gəlin?
- `00:30` **client**: Bəli, çərşənbə 14-də gəlirəm.

## Results (first and only run, 2026-10-09, Gemini 3.8 Flash, low thinking)

| | Agent | Keyword search |
| --- | --- | --- |
| Correct actions | **9/10** | 1/10 |
| Avg time per call | 6.3 s | <1 s |
| Cost per call | $0.0043 | $0 |

**Failed: S-09 (speaker labels swapped).** The telephony tagged the manager's line "При полной оплате дадим скидку 7%" as the client's.
The agent follows the labels, and the prompt says client statements are never promises, so the 7% discount (above the 3% limit) was missed
and the call came out as OK instead of CORRECT_PROMISE. We listed this as a known limitation before the run.
Planned fix: check speaker roles first (a manager line that answers its own question, offers terms or names the company), and send calls
with suspicious labels to a human instead of auto-OK.

**Passed:** client quoting a 10% discount (S-01), down payment said in Azerbaijani words (S-02), "second quarter of next year" date (S-03),
garbled Russian transliteration (S-04), Azerbaijani in Cyrillic (S-05), two promises in one sentence (S-06), promise buried in a long call (S-07),
competitor's claim the manager refused to guarantee (S-08), "üç faiz" discount in words (S-10).

The prompt and rules were not changed after this run.

## Other honest findings from the main runs

- Default thinking: 40/40, but ~30 s per call on average; in another run one call took 205 s and cost $0.11 (6× the usual). Low thinking: 40/40, 6.4 s average, 16 s max, $0.004 per call. We switched to low.
- In a run on our first 22-call set the quote check dropped one fact the model could not back with a real transcript line: the guard fires on live model output, not only in offline tests.
- Bugs found and fixed while building: the next-step criterion counted a step without a time; cold leads were penalised on criteria that do not apply to them; a discount without a number was not flagged; "3%" and "2 000" were not parsed as numbers; dates were compared as raw text; API errors were swallowed silently.
