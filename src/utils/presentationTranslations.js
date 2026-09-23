/**
 * Bilingual UI dictionaries for Interactive Apartment Presentation (RU / TG)
 */
export const presentationDict = {
  ru: {
    // Header & Navigation
    presentationTitle: 'Презентация квартиры',
    tabPlan: 'Интерактивный план',
    tab3d: '3D-модель',
    tabTour360: '360° Виртуальный тур',
    langToggle: 'Язык / Забон',
    
    // Status badges
    statusAvailable: 'Свободна для продажи',
    statusReserved: 'В брони',
    statusSold: 'Продана по договору',
    statusBlocked: 'Заблокирована',

    // Action buttons
    btnReserve: 'Забронировать',
    btnCreateDeal: 'Оформить сделку',
    btnEditLayout: 'Редактировать планировку',
    btnBackToPlan: 'Вернуться к плану',
    btnSave: 'Сохранить',
    btnCancel: 'Отмена',
    btnClose: 'Закрыть',

    // Unit main stats
    unitNumber: 'Квартира №',
    floor: 'Этаж',
    roomsCount: 'Комнат',
    totalArea: 'Общая площадь',
    pricePerM2: 'Цена за м²',
    totalPrice: 'Общая стоимость',
    studio: 'Студия',
    roomsAbbr: 'комн.',

    // Rooms side panel
    roomsHeader: 'Состав и описание комнат',
    roomBadgeLabel: 'Комната',
    noRoomsDefined: 'Описание комнат пока не добавлено администратором',
    selectRoomHint: 'Нажмите на метку на плане или выберите комнату из списка справа',
    finishingHeader: 'Отделка и оснащение:',
    floorFinish: 'Пол',
    wallFinish: 'Стены',
    ceilingFinish: 'Потолок',
    lighting: 'Освещение',
    ventilation: 'Вентиляция',

    // Extended characteristics
    characteristicsHeader: 'Характеристики квартиры',
    livingArea: 'Жилая площадь',
    kitchenArea: 'Площадь кухни',
    ceilingHeight: 'Высота потолков',
    bathroomsCount: 'Санузлы',
    windowsCount: 'Окна',
    doorsCount: 'Двери',
    balconiesCount: 'Балконы / Лоджии',
    heatingType: 'Отопление',
    ventilationType: 'Система вентиляции',
    orientation: 'Сторона света / Вид',
    meters: 'м',
    sqMeters: 'м²',

    // Features block
    featuresHeader: 'Преимущества планировки',
    noFeaturesDefined: 'Преимущества не указаны',

    // Admin Editor
    editorTitle: 'Редактор интерактивной презентации планировки',
    tabBasicInfo: 'Основные данные',
    tabImages: 'Изображения планов',
    tabRoomsEditor: 'Интерактивные комнаты',
    tabCharacteristics: 'Характеристики',
    tabFeatures: 'Преимущества',
    tabPreview: 'Предпросмотр',

    // Admin Editor Forms
    nameRuLabel: 'Название (Русский) *',
    nameTgLabel: 'Название (Таджикский)',
    codeLabel: 'Код планировки *',
    furnishedPlanLabel: 'Меблированный план квартиры',
    technicalPlanLabel: 'Технический чертеж (экспликация)',
    uploadImageHint: 'Перетащите файл или нажмите для загрузки (WebP, PNG, JPG)',

    // Room Editor Canvas
    addRoomBtn: 'Добавить комнату',
    editRoomTitle: 'Редактирование комнаты',
    clickOnPlanToPlaceMarker: 'Кликните на меблированный план, чтобы установить или переместить метку комнаты',
    markerPosition: 'Позиция метки:',
    drawPolygonBtn: 'Разметить контур (Полигон)',
    clearPolygonBtn: 'Очистить контур',
    undoPolygonPoint: 'Отменить последнюю точку',
    polygonPointsCount: 'Точек в контуре:',
    polygonHelpText: 'Кликайте по периметру комнаты на плане, чтобы нарисовать контур подсветки.',

    // Features Form
    addFeatureBtn: 'Добавить преимущество',
    featureTextRu: 'Текст преимущества (RU) *',
    featureTextTg: 'Текст преимущества (TG)',
    iconSelectLabel: 'Иконка',

    // System & Messages
    loadingPresentation: 'Загрузка презентации квартиры...',
    errorLoadingPresentation: 'Не удалось загрузить данные презентации',
    savedSuccessfully: 'Данные успешно сохранены!',
    confirmDeleteRoom: 'Вы уверены, что хотите удалить эту комнату?',
    confirmDeleteFeature: 'Вы уверены, что хотите удалить это преимущество?',
  },
  tg: {
    // Header & Navigation
    presentationTitle: 'Муаррифии манзил',
    tabPlan: 'Нақшаи интерактивӣ',
    tab3d: 'Модели 3D',
    tabTour360: 'Саёҳати 360°',
    langToggle: 'Забон / Язык',
    
    // Status badges
    statusAvailable: 'Озод барои фурӯш',
    statusReserved: 'Дар банд',
    statusSold: 'Фурӯхта шуд',
    statusBlocked: 'Маҳкам шудааст',

    // Action buttons
    btnReserve: 'Брон кардан',
    btnCreateDeal: 'Расмияти шартнома',
    btnEditLayout: 'Таҳрири нақша',
    btnBackToPlan: 'Бозгашт ба нақша',
    btnSave: 'Интихоб / Сохтан',
    btnCancel: 'Бекор кардан',
    btnClose: 'Пӯшидан',

    // Unit main stats
    unitNumber: 'Хонаи №',
    floor: 'Ошиёна',
    roomsCount: 'Хонаҳо',
    totalArea: 'Майдони умумӣ',
    pricePerM2: 'Нарх барои 1 м²',
    totalPrice: 'Нархи умумӣ',
    studio: 'Студия',
    roomsAbbr: 'ҳонагӣ',

    // Rooms side panel
    roomsHeader: 'Сохтор ва тавсифи хонаҳо',
    roomBadgeLabel: 'Хонаи',
    noRoomsDefined: 'Тавсифи хонаҳо аз ҷониби админ илова нашудааст',
    selectRoomHint: 'Ба аломати дар нақша буда пахш кунед ё хонаро аз рӯйхат интихоб кунед',
    finishingHeader: 'Таҷҳизот ва пардоз:',
    floorFinish: 'Фарш',
    wallFinish: 'Деворҳо',
    ceilingFinish: 'Сатҳи шифт',
    lighting: 'Равшанидиҳӣ',
    ventilation: 'Вентилятсия',

    // Extended characteristics
    characteristicsHeader: 'Тавсифи манзил',
    livingArea: 'Майдони истиқоматӣ',
    kitchenArea: 'Майдони ошхона',
    ceilingHeight: 'Баландии шифт',
    bathroomsCount: 'Ҳаммом / Ҳоҷатхона',
    windowsCount: 'Тирезаҳо',
    doorsCount: 'Дарҳо',
    balconiesCount: 'Балкон / Лоджия',
    heatingType: 'Системаи гармидиҳӣ',
    ventilationType: 'Системаи вентилятсия',
    orientation: 'Самти тирезаҳо / Намо',
    meters: 'м',
    sqMeters: 'м²',

    // Features block
    featuresHeader: 'Афзалиятҳои банақшагирӣ',
    noFeaturesDefined: 'Афзалиятҳо нишон дода нашудаанд',

    // Admin Editor
    editorTitle: 'Муҳаррири интерактивӣ ва тавсифи нақша',
    tabBasicInfo: 'Маълумоти асосӣ',
    tabImages: 'Расмҳои нақша',
    tabRoomsEditor: 'Хонаҳои интерактивӣ',
    tabCharacteristics: 'Тавсифот',
    tabFeatures: 'Афзалиятҳо',
    tabPreview: 'Пешнамоиш',

    // Admin Editor Forms
    nameRuLabel: 'Ном (Русӣ) *',
    nameTgLabel: 'Ном (Тоҷикӣ)',
    codeLabel: 'Коди нақша *',
    furnishedPlanLabel: 'Нақшаи мебелдори манзил',
    technicalPlanLabel: 'Расми техникӣ (экспликатсия)',
    uploadImageHint: 'Файлро кашед ё зер кунед (WebP, PNG, JPG)',

    // Room Editor Canvas
    addRoomBtn: 'Илова кардани хона',
    editRoomTitle: 'Таҳрири хона',
    clickOnPlanToPlaceMarker: 'Барои гузоштани аломат ба нақша зер кунед',
    markerPosition: 'Мавқеи аломат:',
    drawPolygonBtn: 'Хати контур (Полигон)',
    clearPolygonBtn: 'Пок кардани контур',
    undoPolygonPoint: 'Бекор кардани нуқта',
    polygonPointsCount: 'Нуқтаҳо дар контур:',
    polygonHelpText: 'Барои сохтани контур нуқтаҳоро дар атрофи хона гузоред.',

    // Features Form
    addFeatureBtn: 'Илова кардани афзалият',
    featureTextRu: 'Матни афзалият (RU) *',
    featureTextTg: 'Матни афзалият (TG)',
    iconSelectLabel: 'Нишона (Иконка)',

    // System & Messages
    loadingPresentation: 'Боргирии муаррифии хона...',
    errorLoadingPresentation: 'Хатогӣ дар боргирии маълумот',
    savedSuccessfully: 'Маълумот бомуваффақият сабт шуд!',
    confirmDeleteRoom: 'Оё Шумо мехоҳед ин хонаро нест кунед?',
    confirmDeleteFeature: 'Оё Шумо мехоҳед ин афзалиятро нест кунед?',
  }
};

/**
 * Gets localized text with fallback logic:
 * selected language value -> russian value -> default fallback string
 */
export function getLocalizedText(valTg, valRu, lang = 'ru', fallback = '') {
  if (lang === 'tg' && valTg && valTg.trim() !== '') {
    return valTg;
  }
  if (valRu && valRu.trim() !== '') {
    return valRu;
  }
  return fallback;
}
