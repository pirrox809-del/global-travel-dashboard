# Generates src/lib/government-data.ts from parsed Wikipedia data
import re, json

heads = json.load(open('/tmp/heads.json'))

# Wikipedia page title -> ISO alpha-2
NAME_TO_ISO = {
  'Afghanistan':'AF','Albania':'AL','Algeria':'DZ','Andorra':'AD','Angola':'AO',
  'Antigua and Barbuda':'AG','Argentina':'AR','Armenia':'AM','Australia':'AU','Austria':'AT',
  'Azerbaijan':'AZ','Bahamas':'BS','Bahrain':'BH','Bangladesh':'BD','Barbados':'BB',
  'Belarus':'BY','Belgium':'BE','Belize':'BZ','Benin':'BJ','Bhutan':'BT',
  'Bolivia':'BO','Bosnia and Herzegovina':'BA','Botswana':'BW','Brazil':'BR','Brunei':'BN',
  'Bulgaria':'BG','Burkina Faso':'BF','Burundi':'BI','Cabo Verde':'CV','Cambodia':'KH',
  'Cameroon':'CM','Canada':'CA','Central African Republic':'CF','Chad':'TD','Chile':'CL',
  'China':'CN','Colombia':'CO','Comoros':'KM','Congo, Democratic Republic of the':'CD',
  'Congo, Republic of the':'CG','Costa Rica':'CR','Croatia':'HR','Cuba':'CU',
  'Cyprus':'CY','Czech Republic':'CZ','Czechia':'CZ','Denmark':'DK','Djibouti':'DJ',
  'Dominica':'DM','Dominican Republic':'DO','Ecuador':'EC','Egypt':'EG','El Salvador':'SV',
  'Equatorial Guinea':'GQ','Eritrea':'ER','Estonia':'EE','Eswatini':'SZ','Ethiopia':'ET',
  'Fiji':'FJ','Finland':'FI','France':'FR','Gabon':'GA','Gambia':'GM',
  'Georgia (country)':'GE','Germany':'DE','Ghana':'GH','Greece':'GR','Grenada':'GD',
  'Guatemala':'GT','Guinea':'GN','Guinea-Bissau':'GW','Guyana':'GY','Haiti':'HT',
  'Honduras':'HN','Hungary':'HU','Iceland':'IS','India':'IN','Indonesia':'ID',
  'Iran':'IR','Iraq':'IQ','Ireland':'IE','Israel':'IL','Italy':'IT',
  'Ivory Coast':'CI','Jamaica':'JM','Japan':'JP','Jordan':'JO','Kazakhstan':'KZ',
  'Kenya':'KE','Kiribati':'KI','Kosovo':'XK','Kuwait':'KW','Kyrgyzstan':'KG',
  'Laos':'LA','Latvia':'LV','Lebanon':'LB','Lesotho':'LS','Liberia':'LR',
  'Libya':'LY','Liechtenstein':'LI','Lithuania':'LT','Luxembourg':'LU','Madagascar':'MG',
  'Malawi':'MW','Malaysia':'MY','Maldives':'MV','Mali':'ML','Malta':'MT',
  'Marshall Islands':'MH','Mauritania':'MR','Mauritius':'MU','Mexico':'MX','Micronesia':'FM',
  'Moldova':'MD','Monaco':'MC','Mongolia':'MN','Montenegro':'ME','Morocco':'MA',
  'Mozambique':'MZ','Myanmar':'MM','Namibia':'NA','Nauru':'NR','Nepal':'NP',
  'Netherlands':'NL','New Zealand':'NZ','Nicaragua':'NI','Niger':'NE','Nigeria':'NG',
  'North Korea':'KP','North Macedonia':'MK','Norway':'NO','Oman':'OM','Pakistan':'PK',
  'Palau':'PW','Palestine':'PS','Panama':'PA','Papua New Guinea':'PG','Paraguay':'PY',
  'Peru':'PE','Philippines':'PH','Poland':'PL','Portugal':'PT','Qatar':'QA',
  'Romania':'RO','Russia':'RU','Rwanda':'RW','Saint Kitts and Nevis':'KN','Saint Lucia':'LC',
  'Saint Vincent and the Grenadines':'VC','Samoa':'WS','San Marino':'SM',
  'Sao Tome and Principe':'ST','Saudi Arabia':'SA','Senegal':'SN','Serbia':'RS','Seychelles':'SC',
  'Sierra Leone':'SL','Singapore':'SG','Slovakia':'SK','Slovenia':'SI','Solomon Islands':'SB',
  'Somalia':'SO','South Africa':'ZA','South Korea':'KR','South Sudan':'SS','Spain':'ES',
  'Sri Lanka':'LK','Sudan':'SD','Suriname':'SR','Sweden':'SE','Switzerland':'CH',
  'Syria':'SY','Taiwan':'TW','Tajikistan':'TJ','Tanzania':'TZ','Thailand':'TH',
  'Timor-Leste':'TL','Togo':'TG','Tonga':'TO','Trinidad and Tobago':'TT','Tunisia':'TN',
  'Turkey':'TR','Turkmenistan':'TM','Tuvalu':'TV','Uganda':'UG','Ukraine':'UA',
  'United Arab Emirates':'AE','United Kingdom':'GB','United States':'US','Uruguay':'UY',
  'Uzbekistan':'UZ','Vanuatu':'VU','Vatican City':'VA','Venezuela':'VE','Vietnam':'VN',
  'Yemen':'YE','Zambia':'ZM','Zimbabwe':'ZW',
  # title-variant names used by the wiki page
  'Kingdom of the Netherlands':'NL','Republic of Ireland':'IE','The Bahamas':'BS',
  'The Gambia':'GM','Democratic Republic of the Congo':'CD','Republic of the Congo':'CG',
  'Federated States of Micronesia':'FM',
  'Sahrawi Arab Democratic Republic':'EH','Cape Verde':'CV','São Tomé and Príncipe':'ST',
}
SKIP = {'Abkhazia','Cook Islands','Niue','European Union','Government of National Stability',
        'Government of Peace and Unity','National Unity Government of Myanmar','Northern Cyprus',
        'Somaliland','South Ossetia','Sovereign Military Order of Malta','Supreme Political Council',
        'Transnistria','Tokelau'}

def clean(s):
    s = re.sub(r'"\]\}\' id="mw\w+">\s*', '', s)
    s = re.sub(r'\{\{.*?\}\}', '', s)
    s = re.sub(r'\s+', ' ', s).strip(' .')
    return s.strip()

G = {}
def t(codes, typ):
    for c in codes.split(): G[c] = typ
t('AD','co-principality'); t('AE','elective-monarchy'); t('AF','islamic-emirate')
t('AG BS BZ DM GD JM KN LC VC PG SB TV AU CA NZ GB ES JP SE NO DK NL BE LU MC LI TH KH BT TO LS BH KW JO MA','constitutional-monarchy')
t('MY AE','elective-monarchy')
t('AL AM AT BA BB BD BG EE GE GR HU IE IL IS LB MD ME MK MT PL RS SI SK TT VU WS XK SM HR LV SG FJ MU BW ZA IT','parliamentary-republic')
t('IQ ET SO IN PK NP DE','federal-parliamentary-republic')
t('US BR MX AR VE NG','federal-presidential-republic')
t('FR RU PT RO LT UA MN TW LK TL CV ST PS','semi-presidential-republic')
t('SA OM BN SZ QA','absolute-monarchy')
t('CN KP CU VN LA ER','one-party-state')
t('IR','theocratic-republic'); t('VA','elective-theocracy'); t('CH','directorial-republic')
t('LY SD MM HT GW BF ML NE GN SY MG YE','transitional-government')

DROP_HOG = {'JO','MA','BH','KW','AE','SA','OM','BN','SZ','QA','CN','KP','CU','VN','LA','ER',
            'US','BR','MX','AR','VE','NG'}

result = {}
def add(iso, typ, hos=None, hog=None):
    entry = {'type': typ}
    if hos: entry['hos'] = hos
    if hog: entry['hog'] = hog
    result[iso] = entry

TITLE_MAP_PRES = [
  (r'^Acting President$', 'president', True),
  (r'^Transitional President$', 'president', True),
  (r'^Interim President$', 'president', True),
  (r'^Co-Presidents$', 'president', False),
  (r'^President$', 'president', False),
  (r'^King$', 'king', False),
  (r'^Emperor$', 'emperor', False),
  (r'^Emir$', 'emir', False),
  (r'^Sultan$', 'sultan', False),
  (r'^Grand Duke$', 'grand-duke', False),
  (r'^Sovereign Prince$', 'prince', False),
  (r'^Prince$', 'prince', False),
  (r'^Pope$', 'pope', False),
  (r'^Supreme Leader$', 'supreme-leader', False),
  (r'^Captains Regent$', 'captain-regent', False),
  (r'^O le Ao o le Malo$', 'head-of-state', False),
  (r'^French Co-Prince$', 'co-prince', False),
  (r'^Episcopal Co-Prince$', 'co-prince', False),
  (r'^Chairman of the Presidential Council$', 'chairman', True),
  (r'^President of the Presidential Leadership Council$', 'chairman', True),
  (r'^President of the National Council .*$', 'chairman', True),
]
TITLE_MAP_GOV = [
  (r'^(Acting|Interim|Transitional|Caretaker) Prime Minister$', 'prime-minister', True),
  (r'^Prime Minister$', 'prime-minister', False),
  (r'^Chancellor$', 'chancellor', False),
  (r'^Taoiseach$', 'taoiseach', False),
  (r'^Minister of State$', 'minister-of-state', False),
  (r'^Premier$', 'prime-minister', False),
  (r'^Chairman of the Council of Ministers$', 'prime-minister', False),
  (r'^Chairwoman of the Council of Ministers$', 'prime-minister', False),
]
SKIP_HOS = ('Crown Prince','Governor-General','Governor General','Regent','Queen Mother',
            "King's Representative",'Personal Representative','High Representative',
            'President of the Governorate','President of the Patriotic Movement','General Secretary',
            'Chief of the High Command','Acting High Representative','Episcopal Personal',
            'French Personal')

for wiki_name, offices in heads.items():
    if wiki_name in SKIP or wiki_name not in NAME_TO_ISO: continue
    iso = NAME_TO_ISO[wiki_name]
    if iso in result: continue
    typ = G.get(iso, 'presidential-republic')
    hos = hog = None
    for office, name in offices:
        office = clean(office); name = clean(name)
        if not name or name == 'Vacant': continue
        is_hos = False
        for pat, title, acting in TITLE_MAP_PRES:
            if re.match(pat, office):
                if title == 'co-prince':
                    # combine multiple co-princes into one office
                    if hos:
                        hos['name'] = f"{hos['name']} and {name}"
                    else:
                        hos = {'name': name, 'title': title, 'acting': acting}
                elif hos is None:
                    hos = {'name': name, 'title': title, 'acting': acting}
                is_hos = True
                break
        if is_hos: continue
        if any(office.startswith(s) for s in SKIP_HOS): continue
        for pat, title, acting in TITLE_MAP_GOV:
            if re.match(pat, office):
                if hog is None:
                    hog = {'name': name, 'title': title, 'acting': acting}
                break
    if iso == 'IR':
        hos = {'name': 'Ali Khamenei', 'title': 'supreme-leader', 'acting': False}
        hog = {'name': 'Masoud Pezeshkian', 'title': 'president', 'acting': False}
    if iso == 'CH':
        hos = {'name': 'Guy Parmelin', 'title': 'president', 'acting': False}
    if iso == 'BA':
        hos = {'name': 'Denis Bećirović', 'title': 'chairman', 'acting': False}
        hog = {'name': 'Borjana Krišto', 'title': 'prime-minister', 'acting': False}
    if iso == 'KP':
        hos = {'name': 'Kim Jong Un', 'title': 'supreme-leader', 'acting': False}
        hog = None
    if iso == 'SD':
        hos = {'name': 'Abdel Fattah al-Burhan', 'title': 'president', 'acting': True}
        hog = {'name': 'Kamil Idris', 'title': 'prime-minister', 'acting': False}
    if iso in DROP_HOG: hog = None
    add(iso, typ, hos, hog)

if 'EH' not in result:
    result['EH'] = {'type': 'presidential-republic', 'hos': {'name': 'Brahim Ghali', 'title': 'president', 'acting': False}}
if 'CH' not in result:
    result['CH'] = {'type': 'directorial-republic', 'hos': {'name': 'Guy Parmelin', 'title': 'president', 'acting': False}}

json.dump(result, open('/tmp/gov.json','w'), ensure_ascii=False, indent=1)
print('countries:', len(result))
for k in ['IT','FR','US','GB','CH','BA','IR','SD','GW','HT','SM','AD','VA','NI','TW','KP','CN','MY','AE','NO']:
    print(k, json.dumps(result.get(k), ensure_ascii=False)[:200])
ALL = 'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW EH XK'
missing = [k for k in ALL.split() if k not in result]
print('MISSING:', missing)
