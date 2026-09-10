import { aliceChaptersOneToFourIpa } from "./aliceChaptersOneToFourIpa";

export type AliceLexicalPartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "determiner"
  | "interjection"
  | "proper noun";

export type AliceLexicalSupplement = {
  lemma: string;
  translation: string;
  transcription: string;
  partOfSpeech: AliceLexicalPartOfSpeech;
  isProperNoun?: boolean;
  isArchaic?: boolean;
};

type SeedPartOfSpeech = "n" | "v" | "adj" | "adv" | "pron" | "prep" | "conj" | "det" | "int" | "proper";

const partOfSpeechByCode: Record<SeedPartOfSpeech, AliceLexicalPartOfSpeech> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  pron: "pronoun",
  prep: "preposition",
  conj: "conjunction",
  det: "determiner",
  int: "interjection",
  proper: "proper noun",
};

// These entries cover only forms that occur without lexical data in chapters 1-4.
// The compact source keeps every surface form auditable while preserving the book text.
const lexicalSeed = `
a-piece|apiece|adv|по штуке
able|able|adj|способный; в состоянии
absurd|absurd|adj|нелепый
acceptance|acceptance|n|принятие
accustomed|accustomed|adj|привыкший
ada|Ada|proper|Ада
addressing|address|v|обращаясь
adjourn|adjourn|v|перенести заседание
adoption|adoption|n|принятие
advisable|advisable|adj|целесообразный
ago|ago|adv|тому назад
ahem|ahem|int|кхм
allow|allow|v|позволять
alone|alone|adj|один; в одиночестве
animal|animal|n|животное
animals|animal|n|животные
animal’s|animal|n|животного
ann|Ann|proper|Энн
apples|apple|n|яблоки
archbishop|archbishop|n|архиепископ
argument|argument|n|спор
arranged|arrange|v|устроил; расположил
arrum|arm|n|рука (так произносит Пэт)
ashamed|ashamed|adj|пристыженный; стыдно
assembled|assemble|v|собравшиеся
atheling|Atheling|proper|Этелинг; наследный принц
attempt|attempt|n|попытка
attending|attend|v|слушая; уделяя внимание
audibly|audibly|adv|слышно; вслух
authority|authority|n|авторитет; власть
avoid|avoid|v|избежать
bad|bad|adj|плохой
bark|bark|n|лай
barking|bark|v|лая
barrowful|barrowful|n|полная тачка
bathing|bathe|adj|купальный
bear|bear|v|выдерживать; нести
beautifully|beautifully|adv|красиво
bed|bed|n|постель
begged|beg|v|умолял; просил
below|below|adv|внизу
bend|bend|v|согнуть
bent|bend|v|нагнулся; согнул
besides|besides|adv|кроме того
bill’s|Bill|proper|Билла
bird|bird|n|птица
blades|blade|n|травинки
blue|blue|adj|синий
bowed|bow|v|поклонился
brass|brass|n|латунь
breath|breath|n|дыхание
bright-eyed|bright-eyed|adj|с ясными глазами
bristling|bristle|v|ощетинившись
brother’s|brother|n|брата
brown|brown|adj|коричневый
burst|burst|v|разразиться; лопнуть
buttercup|buttercup|n|лютик
canary|canary|n|канарейка
canterbury|Canterbury|proper|Кентербери
capital|capital|adj|отличный
carefully|carefully|adv|осторожно
carrier|carrier|n|посыльный
cart-horse|cart-horse|n|ломовая лошадь
cartwheels|cartwheel|n|колёса телеги
cause|cause|n|причина
caused|cause|v|вызвал
ceiling|ceiling|n|потолок
chance|chance|n|шанс; случай
charges|charge|n|атаки; наскоки
chatte|chatte|n|кошка
cheered|cheer|v|приветствовали возгласами
cheerfully|cheerfully|adv|весело
choke|choke|v|подавиться
choked|choke|v|подавился
christmas|Christmas|proper|Рождество
circle|circle|n|круг
circumstances|circumstance|n|обстоятельства
claws|claw|n|когти
clear|clear|adj|ясный
clinging|cling|v|цепляясь
coast|coast|n|побережье
coaxing|coax|v|уговаривая
cold|cold|adj|холодный
comfort|comfort|n|утешение
commotion|commotion|n|суматоха
complained|complain|v|пожаловался
completely|completely|adv|полностью
concluded|conclude|v|заключила
conclusion|conclusion|n|вывод
condemn|condemn|v|приговорить
conduct|conduct|n|поведение
confused|confuse|adj|растерянный
conqueror|conqueror|n|завоеватель
conquest|conquest|n|завоевание
consultation|consultation|n|совещание
coward|coward|n|трус
crab|crab|n|краб
crash|crash|n|грохот
crocodile|crocodile|n|крокодил
cross|cross|adj|сердитый
crossed|cross|v|скрестила
crossly|crossly|adv|сердито
crowd|crowd|n|толпа
crown|crown|n|корона
cry|cry|v|плакать; кричать
cucumber-frame|cucumber-frame|n|парник для огурцов
cucumber-frames|cucumber-frame|n|парники для огурцов
cunning|cunning|adj|хитрый
cur|cur|n|дворняга
curiouser|curious|adj|всё чудесатее
curled|curl|v|свернулась
curly|curly|adj|кудрявый
d|D|n|буква D
daresay|daresay|v|полагаю; осмелюсь сказать
darkness|darkness|n|темнота
daughter|daughter|n|дочь
dead|dead|adj|мёртвый
death|death|n|смерть
declare|declare|v|заявлять
declared|declare|v|объявил
denial|denial|n|отрицание
despair|despair|n|отчаяние
desperate|desperate|adj|отчаянный
difficulty|difficulty|n|трудность
digging|dig|v|копая
dinah’s|Dinah|proper|Дины
dinner|dinner|n|обед
directly|directly|adv|немедленно
dodged|dodge|v|увернулся
dog|dog|n|собака
dogs|dog|n|собаки
doth|do|v|делает
doubt|doubt|n|сомнение
draggled|draggle|adj|промокший и растрёпанный
dressed|dress|adj|одетый
dried|dry|v|высохли
driest|dry|adj|самый сухой
dripping|drip|v|стекая каплями
drowned|drown|v|утонул
drunk|drink|v|выпитый
duck|Duck|proper|Утка
eaglet|Eaglet|proper|Орлёнок
earls|earl|n|графы
easily|easily|adv|легко
easy|easy|adj|лёгкий
edgar|Edgar|proper|Эдгар
edge|edge|n|край
edwin|Edwin|proper|Эдвин
effect|effect|n|действие; эффект
elbow|elbow|n|локоть
elegant|elegant|adj|изящный
em|them|pron|их; им
energetic|energetic|adj|решительный; энергичный
engraved|engrave|v|выгравировано
enormous|enormous|adj|огромный
escape|escape|n|спасение; побег
esq|esquire|n|эсквайр
est|be|v|есть
exact|exact|adj|точный
excellent|excellent|adj|превосходный
existence|existence|n|существование
expected|expect|v|ожидала
failure|failure|n|неудача
faint|faint|adj|слабый; едва слышный
fairy-tales|fairy-tale|n|волшебные сказки
familiarly|familiarly|adv|запросто
family|family|n|семья
fancied|fancy|v|воображала
fanned|fan|v|обмахивалась
fanning|fan|v|обмахиваясь
farmer|farmer|n|фермер
favoured|favour|v|поддержанный
feathers|feather|n|перья
feeble|feeble|adj|слабый
feebly|feebly|adv|слабо
fellow|fellow|n|малый; парень
fender|fender|n|каминная решётка
ferrets|ferret|n|хорьки
fifth|fifth|adj|пятый
fills|fill|v|наполняет
fire|fire|n|огонь
fireplace|fireplace|n|камин
fishes|fish|n|рыбы
fixed|fix|adj|устремлённый; неподвижный
floor|floor|n|пол
flustered|fluster|adj|взволнованный
folded|fold|adj|сложенный
foolish|foolish|adj|глупый
footsteps|footstep|n|шаги
forehead|forehead|n|лоб
forgetting|forget|v|забыв
forgot|forget|v|забыла
forwards|forwards|adv|вперёд
french|French|proper|французский язык
fright|fright|n|испуг
frog|Frog|proper|Лягушонок
frowning|frown|v|нахмурившись
fur|fur|n|мех
fury|Fury|proper|Фурия
gallons|gallon|n|галлоны
general|general|adj|общий
gently|gently|adv|мягко
geography|geography|n|география
giving|give|v|давая
good-bye|good-bye|int|до свидания
good-naturedly|good-naturedly|adv|добродушно
goose|goose|n|гусь
grammar|grammar|n|грамматика
grass|grass|n|трава
grave|grave|adj|серьёзный
gravely|gravely|adv|серьёзно
grew|grow|v|выросла
growled|growl|v|прорычал
guess|guess|v|полагать; угадывать
guessed|guess|v|догадалась
guinea-pigs|guinea-pig|n|морские свинки
harm|harm|n|вред
hate|hate|v|ненавидеть
hated|hate|v|ненавидела
hearthrug|hearthrug|n|коврик у камина
heels|heel|n|пятки
held|hold|v|держал
he’ll|he|pron|он будет
hide|hide|v|спрятать
hippopotamus|hippopotamus|n|гиппопотам
hit|hit|v|ударил
hoarse|hoarse|adj|хриплый
hoarsely|hoarsely|adv|хрипло
honour|honour|n|честь
hoped|hope|v|надеялась
hopeless|hopeless|adj|безнадёжный
hour|hour|n|час
housemaid|housemaid|n|горничная
humbly|humbly|adv|смиренно
hundred|hundred|n|сто
hungry|hungry|adj|голодный
hunting|hunt|v|охотясь
hurriedly|hurriedly|adv|торопливо
immediate|immediate|adj|немедленный
immediately|immediately|adv|немедленно
improve|improve|v|улучшать
inclined|incline|adj|склонный
inquisitively|inquisitively|adv|вопросительно; с любопытством
insolence|insolence|n|дерзость
insult|insult|n|оскорбление
inwards|inwards|adv|внутрь
jack-in-the-box|jack-in-the-box|n|чёртик из коробочки
jaws|jaw|n|челюсти
judge|judge|n|судья
kick|kick|n|пинок
kills|kill|v|убивает
kneel|kneel|v|встать на колени
knocking|knock|v|стуча
knot|knot|n|узел
known|know|v|знала
lad|lad|n|парень
ladder|ladder|n|лестница
lap|lap|n|колени
largest|large|adj|самый большой
latin|Latin|proper|латынь
laugh|laugh|v|смеяться
law|law|n|закон
lay|lie|v|лежал
lazily|lazily|adv|лениво
leaders|leader|n|предводители
leant|lean|v|прислонилась
leap|leap|n|прыжок
lesson|lesson|n|урок
lesson-book|lesson-book|n|учебник
lesson-books|lesson-book|n|учебники
lest|lest|conj|чтобы не
licking|lick|v|облизывая
lips|lip|n|губы
lodging|lodging|n|жильё
london|London|proper|Лондон
lonely|lonely|adj|одинокий
looking-glass|looking-glass|n|зеркало
loose|loose|adj|свободный; незакреплённый
lose|lose|v|потерять
love|love|n|любовь
low-spirited|low-spirited|adj|унылый
luckily|luckily|adv|к счастью
ma|ma|n|мама
mabel|Mabel|proper|Мейбл
machines|machine|n|машины
magic|magic|adj|волшебный
magpie|Magpie|proper|Сорока
mary|Mary|proper|Мэри
master|master|n|хозяин
measure|measure|v|измерить
meet|meet|v|встретить
meeting|meeting|n|собрание
mentioned|mention|v|упомянула
mercia|Mercia|proper|Мерсия
messages|message|n|поручения
met|meet|v|встретил
mistake|mistake|n|ошибка
moderate|moderate|adj|умеренный
morcar|Morcar|proper|Моркар
mouse’s|Mouse|proper|Мыши
move|move|v|двигаться
moving|move|v|двигаясь
multiplication|multiplication|n|умножение
muttering|mutter|v|бормоча
narrow|narrow|adj|узкий
nasty|nasty|adj|противный
nay|nay|adv|более того
neat|neat|adj|аккуратный
neatly|neatly|adv|аккуратно
nevertheless|nevertheless|adv|тем не менее
nicely|nicely|adv|хорошо; мило
night|night|n|ночь
night-air|night-air|n|ночной воздух
nile|Nile|proper|Нил
noise|noise|n|шум
normans|Norman|proper|норманны
northumbria|Northumbria|proper|Нортумбрия
notion|notion|n|представление
nowhere|nowhere|adv|нигде
nurse|nurse|n|няня
o|O|int|о
odd|odd|adj|странный
offer|offer|v|предложить
older|old|adj|старше
one’s|one|pron|чей-либо; свой
ordered|order|v|приказал
ordering|order|v|приказывая
outside|outside|adv|снаружи
oyster|Oyster|proper|Устрица
pale|pale|adj|бледный
panting|pant|v|тяжело дыша
paris|Paris|proper|Париж
particular|particular|adj|особый
passion|passion|n|ярость
passionate|passionate|adj|вспыльчивый
pat|Pat|proper|Пэт
patience|patience|n|терпение
patriotic|patriotic|adj|патриотический
patted|pat|v|похлопал
pattering|patter|n|топот; частый стук
paused|pause|v|остановился
paw|paw|n|лапа
paws|paw|n|лапы
pebbles|pebble|n|камешки
peering|peer|v|вглядываясь
pet|pet|n|любимец
picked|pick|v|подняла; подобрала
pity|pity|n|жалость
placed|place|v|положил
plan|plan|n|план
planning|plan|v|планируя
plate|plate|n|табличка
pleaded|plead|v|взмолилась
pleasanter|pleasant|adj|приятнее
pointed|point|v|указал
pointing|point|v|указывая
poky|poky|adj|тесный
pope|Pope|proper|Папа Римский
position|position|n|положение
positively|positively|adv|решительно
possible|possible|adj|возможный
pounds|pound|n|фунты
pour|pour|v|лить
pressed|press|v|прижалась
pressing|press|v|нажимая
pretexts|pretext|n|предлоги; отговорки
prize|prize|n|приз
proceed|proceed|v|продолжать
produced|produce|v|превратились; произвёл
promised|promise|v|пообещала
pronounced|pronounce|v|произнёс
prosecute|prosecute|v|привлечь к суду
proved|prove|v|оказалась
pulled|pull|v|вытащила
pulling|pull|v|вытаскивая
punished|punish|v|наказана
puppy’s|puppy|n|щенка
purring|purr|v|мурлыкая
putting|put|v|надевая; помещая
puzzle|puzzle|n|загадка
puzzling|puzzle|adj|загадочный
queer-looking|queer-looking|adj|странного вида
quick|quick|adj|быстрый
quicker|quick|adj|быстрее
quiet|quiet|adj|тихий
quiver|quiver|n|дрожь
rabbit’s|Rabbit|proper|Кролика
race|race|n|гонка
race-course|race-course|n|дорожка для бега
railway|railway|n|железная дорога
rapidly|rapidly|adv|быстро
rattling|rattle|v|стуча; гремя
real|real|adj|настоящий
refused|refuse|v|отказался
remedies|remedy|n|средства
resource|resource|n|способ; находчивость
returning|return|v|возвращаясь
ring|ring|n|круг
ringlets|ringlet|n|локоны
rising|rise|v|вставая
rome|Rome|proper|Рим
rope|rope|n|верёвка
rumbling|rumble|n|грохот
run|run|v|бежать
rush|rush|n|стремительный бросок
rushed|rush|v|бросился
sad|sad|adj|грустный
safe|safe|adj|в безопасности
salt|salt|adj|солёный
sand|sand|n|песок
save|save|v|спасти
scale|scale|n|чешуя
scrambling|scramble|v|карабкаясь
scratching|scratch|v|царапая
seaside|seaside|n|морское побережье
sending|send|v|посылая
sensation|sensation|n|ощущение
sense|sense|n|смысл
series|series|n|череда
shakespeare|Shakespeare|proper|Шекспир
shape|shape|n|форма
shedding|shed|v|проливая
she’d|she|pron|она бы; она имела
shining|shine|adj|блестящий
shiver|shiver|n|дрожь
shore|shore|n|берег
short|short|adj|короткий
show|show|v|показать
shower|shower|n|ливень; град
shy|shy|adj|робкий
sighing|sigh|v|вздыхая
signify|signify|v|означать
simply|simply|adv|просто
since|since|prep|с тех пор как
six|six|n|шесть
skurried|scurry|v|поспешил прочь
sky-rocket|sky-rocket|n|ракета
slipped|slip|v|поскользнулась
smallest|small|adj|самый маленький
smile|smile|n|улыбка
smiling|smile|v|улыбаясь
smoking|smoke|v|куря
snappishly|snappishly|adv|раздражённо
snatch|snatch|n|резкий взмах
soft|soft|adj|мягкий
softly|softly|adv|тихо
solemn|solemn|adj|торжественный
solemnly|solemnly|adv|торжественно
somehow|somehow|adv|как-то
soothing|soothe|adj|успокаивающий
sorrowful|sorrowful|adj|печальный
spades|spade|n|лопаты
speech|speech|n|речь
speed|speed|n|скорость
spite|spite|n|злость
splash|splash|n|всплеск
splashing|splash|v|плескаясь
splendidly|splendidly|adv|великолепно
spread|spread|v|расправил; распростёр
squeaking|squeak|adj|писклявый
station|station|n|станция
stick|stick|n|палка
stigand|Stigand|proper|Стиганд
stockings|stocking|n|чулки
stoop|stoop|v|нагнуться
stopped|stop|v|остановился
stretched|stretch|v|вытянула
stretching|stretch|v|вытягивая
struck|strike|v|пришла в голову; ударила
submitted|submit|v|покорился
suit|suit|v|подходить
sulky|sulky|adj|угрюмый
swallowed|swallow|v|проглотила
swimming|swim|v|плывя
tale|tale|n|рассказ
teaching|teach|v|обучая
terribly|terribly|adv|ужасно
terrier|terrier|n|терьер
thank|thank|v|благодарить
that’ll|that|pron|это будет
theirs|they|pron|их; принадлежащее им
they’d|they|pron|они бы; они имели
thick|thick|adj|густой
thirteen|thirteen|n|тринадцать
thistle|thistle|n|чертополох
throat|throat|n|горло
throw|throw|v|бросить
tidy|tidy|adj|опрятный
tie|tie|v|связать
timid|timid|adj|робкий
tiptoe|tiptoe|n|цыпочки
tittered|titter|v|хихикнул
to-day|today|adv|сегодня
tongue|tongue|n|язык
touch|touch|v|коснуться
toys|toy|n|игрушки
trampled|trample|v|затоптал
trembled|tremble|v|задрожала
tricks|trick|n|трюки
trotting|trot|v|семеня
tumbled|tumble|v|кувыркнулся
twelve|twelve|n|двенадцать
twenty|twenty|n|двадцать
ugh|ugh|int|фу
uncomfortable|uncomfortable|adj|неудобный
uncorked|uncork|v|откупорила
undo|undo|v|развязать
unhappy|unhappy|adj|несчастный
upstairs|upstairs|adv|наверху
useful|useful|adj|полезный
usurpation|usurpation|n|узурпация
vanished|vanish|v|исчез
various|various|adj|разные
voices|voice|n|голоса
vulgar|vulgar|adj|вульгарный
w|W|proper|У.
walrus|walrus|n|морж
washing|wash|v|умывая
wasting|waste|v|тратя впустую
water|water|n|вода
waters|water|n|воды
welcome|welcome|adj|желанный
wept|weep|v|плакала
wet|wet|adj|мокрый
whatever|whatever|pron|что бы ни
whenever|whenever|conj|всякий раз когда
whereupon|whereupon|conj|после чего
wherever|wherever|conj|где бы ни
where’s|where|adv|где находится
whisper|whisper|n|шёпот
whispers|whisper|v|шепчет
whistle|whistle|v|свистнуть
whose|whose|pron|чей
william’s|William|proper|Вильгельма
wink|wink|v|подмигнуть
winter|winter|n|зима
woman|woman|n|женщина
won|win|v|выиграл
wooden|wooden|adj|деревянный
worm|worm|n|червяк
worry|worry|v|терзать; трепать
worse|bad|adj|хуже
wrapping|wrap|v|укутывая
ye|you|pron|вы; тебя
yelp|yelp|n|визг
yer|your|pron|твой
yesterday|yesterday|adv|вчера
`;

export const aliceChaptersOneToFourLexicon = Object.fromEntries(
  lexicalSeed
    .trim()
    .split("\n")
    .map((line) => {
      const [surface, lemma, partOfSpeechCode, translation] = line.split("|");
      const partOfSpeech = partOfSpeechByCode[partOfSpeechCode as SeedPartOfSpeech];
      const transcription = aliceChaptersOneToFourIpa[surface];

      if (!surface || !lemma || !translation || !partOfSpeech || !transcription) {
        throw new Error(`Invalid Alice chapters 1-4 lexical entry: ${line}`);
      }

      return [
        surface,
        {
          lemma,
          translation,
          transcription,
          partOfSpeech,
          isProperNoun: partOfSpeech === "proper noun",
          isArchaic: ["arrum", "doth", "est", "ye", "yer"].includes(surface),
        } satisfies AliceLexicalSupplement,
      ];
    }),
) as Record<string, AliceLexicalSupplement>;
