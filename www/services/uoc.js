angular.module('UOCNotifier')

.factory('$uoc', function($settings, $queue, $q, $classes, $debug, $date, $notifications, $utils, Classroom, Resource, CalEvent) {

    var self = {};

    self.check_messages = function() {
        var promises = [];

        promises.push(retrieve_mail());
        promises.push(retrieve_announcements());
        promises.push(retrieve_calendar());
        promises.push(retrieve_agenda());

        return $q.all(promises).then(function() {
            $classes.save();
        });
    };

    function retrieve_calendar() {
        // Get the new aulas
        var args = {
            perfil : 'estudiant',
            setLng : $settings.get_lang(),
            format: 'json'
        };

        return $queue.get('/app/guaita/calendari', args, true).then(function(data) {
            $settings.save_idp(data.idp);

            for (var x in data.classrooms) {
                parse_classroom(data.classrooms[x]);
            }
        }).catch(function() {
            // Fail silently
            return $q.when();
        }).then(function() {
            var promises = [];

            $classes.purge_old();

            promises.push(retrieve_tutoria_from_rss());
            promises.push(retrieve_gradeinfo());

            var classrooms = $classes.get_notified();
            for(var i in classrooms) {
                promises.push(retrieve_final_grades(classrooms[i]));
                promises.push(retrieve_stats(classrooms[i]));
            }

            promises.push(retrieve_final_exams_event());

            return $q.all(promises);
        });
    }

    function parse_classroom(classr) {
        var title = classr.shortTitle ? classr.shortTitle : classr.title;
        var classroom = $classes.search('domainassig', classr.domainFatherId);
        if (!classroom) {
            var aul = title.lastIndexOf(" aula " + classr.numeralAula);
            if (aul > 0) {
                title = title.substr(0, aul);
            }

            classroom = new Classroom(title, classr.domainCode, classr.domainId, classr.domainTypeId);
            classroom.domainassig = classr.domainFatherId;
        } else {
            classroom.code = classr.domainCode;
            classroom.domain = classr.domainId;
            classroom.type = classr.domainTypeId;
        }
        classroom.set_color(classr.color);
        classroom.any = classr.anyAcademic;
        classroom.aula = classr.numeralAula;
        classroom.subject_code = classr.planCode;

        var consultor = false;
        if (typeof classr.widget.consultor != 'undefined' && typeof classr.widget.consultor.nomComplert != 'undefined') {
            consultor = classr.widget.consultor.nomComplert;
        }

        for (var x in classr.widget.referenceUsers) {
            if (!consultor || classr.widget.referenceUsers[x].fullName == consultor) {
                classroom.consultor = classr.widget.referenceUsers[x].fullName;
                classroom.consultormail = classr.widget.referenceUsers[x].email;
                classroom.consultorlastviewed = classr.widget.referenceUsers[x].lastLoginTime;
                break;
            }
        }
        $classes.add(classroom);

        if (!$classes.get_notify(classroom.code)) {
            return $q.when();
        }

        // Parse events
        if (classr.activitats.length > 0) {
            for (var y in classr.activitats) {
                var urlbase, link, eventtype;

                var act = classr.activitats[y];

                switch(act.eventTypeId) {
                    case 31:
                        eventtype = 'MODULE';
                        break;
                    case 28: // Practica
                    case 29: // PAC
                        eventtype = 'ASSIGNMENT';
                        break;
                    case 23: // Old study guides...
                        $debug.error('Study guide found! :D');
                        eventtype = 'STUDY_GUIDE';
                        break;
                    default:
                        eventtype = 'ASSIGNMENT';
                        $debug.error('Unknown event type ' + act.eventTypeId);
                        $debug.print(act);
                        break;
                }

                var evnt = new CalEvent(act.name, act.eventId, eventtype);

                if (act.link) {
                    evnt.link = $utils.empty_url_attr(act.link, 's');
                } else {
                    $debug.error('Link not found');
                    $debug.print(act);
                    var args = {};
                    if (classr.presentation == "AULACA") {
                        urlbase = '/webapps/aulaca/classroom/Classroom.action';
                        args.classroomId = act.classroomId;
                        args.subjectId = act.subjectId;
                        args.activityId = act.eventId;
                        args.javascriptDisabled = false;
                    } else {
                        urlbase = '/webapps/classroom/081_common/jsp/eventFS.jsp';
                        args.domainId = act.domainId;
                        var aux = classr.domainCode.split('_');
                        args.domainTemplate = 'uoc_'+aux[0]+'_'+classr.codi;
                        args.idLang =  $settings.get_lang_code();
                        args.eventsId = act.eventId;
                        args.opId = 'view';
                        args.userTypeId = 'ESTUDIANT';
                        args.canCreateEvent = false;
                    }
                    evnt.link = urlbase + '?' + $utils.uri_data(args) + '&s=';
                }

                evnt.start = $date.getDate(act.startDate, true);
                evnt.end = $date.getDate(act.deliveryDate, true);
                evnt.solution = $date.getDate(act.solutionDate, true);
                evnt.grading = $date.getDate(act.qualificationDate, true);
                classroom.add_event(evnt);
            }
        }

        // Parse resources
        var promises = [];
        if (classr.widget.eines.length > 0) {
            classroom.delete_old_resources();
            for(var j in classr.widget.eines) {
                var resourcel = classr.widget.eines[j];
                if (resourcel.nom) {
                    var resource = new Resource(resourcel.nom, resourcel.resourceId);
                    resource.set_link(resourcel.viewItemsUrl);
                    resource.set_pos(j);
                    resource = classroom.add_resource(resource);
                    promises.push(retrieve_resource(classroom, resource));
                }
            }
        }

        if (!classroom.final_grades && !classroom.stats) {
            promises.push(retrieve_timeline(classroom));
        }
        return $q.all(promises);
    }

    function retrieve_announcements() {
        var args = {
            'app:mobile': true,
            'app:cache': false,
            'app:only' : 'avisos'
        };

        return $queue.get('/rb/inici/grid.rss', args, false).then(function(resp) {
            var announcements = [];
            var items = $(resp).find('item category:contains(\'ANNOUNCEMENT\')').parents('item');
            if (items.length > 0) {
                items.each(function() {
                    var json = rssitem_to_json(this);
                    if (json.title != "" && json.description != "") {
                        var announcement = {
                            title: json.title,
                            description: json.description,
                            link: json.link
                        };

                        announcement.date = $date.formatDate(json.pubDate);

                        announcements.push(announcement);
                    }
                });
            }
            $settings.save_announcements(announcements);
        });
    }

    function retrieve_mail() {
        if ($settings.get_check_mail()) {
            var args = {
                'app:mobile': true,
                'app:cache': false,
                'app:only' : 'bustia'
            };
            return $queue.get('/rb/inici/grid.rss', args, false).then(function(resp) {
                $(resp).find('item').each(function() {
                    var description = $(this).find('description').first().text();
                    var matches = description.match(/:([0-9]+):([0-9]+)$/);
                    if (matches && matches[1]) {
                        save_mail(matches[1]);
                    }
                });

            });
        }
        return $q.when();
    }

    function retrieve_tutoria_from_rss() {
        var args = {
            'app:mobile': true,
            'app:cache': false,
            'app:only' : 'aules'
        };
        return $queue.get('/rb/inici/grid.rss', args, false).then(function(resp) {
            $(resp).find('item').each(function() {
                var item = $(this);
                var category = item.find('category').first().text();
                if (category.indexOf('AULA_TUTOR_DEFINITION') >= 0) {
                    var code = category.split('-')[0],
                        domainId = category.split('-')[1];
                        classroom = $classes.search('domainassig', domainId),
                        title = $utils.get_html_realtext(item.find('title').text()),
                        codiTercers = code.split('_')[0].toUpperCase() || false;

                    if (codiTercers) {
                        var aux = title.split(codiTercers)[0].trim();
                        title = aux ? aux : title;
                    }

                    if (!classroom) {
                        classroom = new Classroom(title, code, domainId, 'TUTORIA');
                    } else {
                        classroom.title = title;
                        classroom.code = code;
                        classroom.domain = domainId;
                        classroom.domainassig = domainId;
                        classroom.type = 'TUTORIA';
                    }
                    classroom.aula = codiTercers;

                    var tagColor = item.find('category:contains("MODUL_COLOR")').first().text();
                    if (tagColor) {
                        classroom.color = tagColor.split('#')[1].split('-')[0];
                    }

                    if (classroom.notify) {
                        retrieve_consultor(classroom);
                        try {
                            $(resp).find("item > category:contains('" + code + "-AULA'):contains('_RESOURCES')").each(function() {
                                var item = rssitem_to_json($(this).parent()),
                                    title = $utils.get_html_realtext(item.title);

                                if (title) {
                                    var resource = new Resource(title, "");
                                    resource.set_link(item.url);
                                    resource.code = $utils.get_url_attr(resource.link, 'l');
                                    if (title != 'Microblog') {
                                        resource.type = "old";
                                        var messages = parseInt(item.description.split(':')[0]);
                                            allmessages = parseInt(item.description.split(':')[1]);
                                        resource.set_messages(messages, allmessages);
                                    } else {
                                        resource.type = "oldblog";
                                    }
                                    classroom.add_resource(resource);
                                }
                            });
                        } catch (err) {
                            $debug.error(err);
                        }
                    }

                    $classes.add(classroom);
                }
            });
        });
    }

    function retrieve_gradeinfo() {
        if ($classes.is_all_graded()) {
            return $q.when();
        }

        return $queue.get('/rb/inici/api/enrollment/rac.xml', {}, false).then(function(data) {
            $(data).find('files>file').each(function() {
                var exped = $(this).children('id').first().text().trim();

                $(this).find('listaAsignaturas asignatura').each(function() {
                    // If has a children of same type
                    if ($(this).has('asignatura').length > 0) {
                        return;
                    }

                    var subject_code = $(this).find('codigo').first().text().trim();
                    var classroom = $classes.search('subject_code', subject_code);
                    if (classroom && !classroom.notify) {
                        return;
                    }

                    $(this).find('listaActividades actividad').each(function() {
                        // If has a children of same type
                        if ($(this).has('actividad').length > 0) {
                            return;
                        }

                        var eventid = $(this).find('pacId').text().trim();
                        if (eventid) {
                            if (!classroom) {
                                classroom = $classes.get_class_by_event(eventid);
                                if (!classroom) {
                                    return;
                                }

                                // Save the real subject code
                                classroom.subject_code = subject_code;
                            }

                            if (!classroom.notify) {
                                return;
                            }
                            classroom.exped = exped;

                            var evnt = classroom.get_event(eventid);
                            if (evnt && evnt.is_assignment()) {
                                var changed = false;

                                var committed = $(this).find('listaEntregas>entrega').length > 0;
                                if (committed) {
                                    evnt.committed = true;
                                    var viewed = $(this).find('listaEntregas>entrega').last().find('fechaDescargaConsultor').html();
                                    evnt.viewed = viewed && viewed.length ? viewed: false;
                                    changed = true;
                                }

                                var comments = $(this).find('listaComentarios>comentario').length > 0;
                                if (comments) {
                                    var lastcomment = $(this).find('listaComentarios>comentario').last();
                                    evnt.commenttext = lastcomment.find('texto').html();
                                    evnt.commentdate= lastcomment.find('fechaComentario').html();
                                    changed = true;
                                }

                                var grade = $(this).find('nota').text().trim();
                                if (grade.length > 0 && grade != '-') {
                                    if (evnt.graded != grade) {
                                        evnt.graded = grade;
                                        changed = true;
                                        evnt.notify(classroom.get_acronym());
                                    }
                                }
                                if (changed) {
                                    classroom.add_event(evnt);
                                }
                            }
                        } else if(classroom) {
                            if (!classroom.notify) {
                                return;
                            }
                            classroom.exped = exped;

                            var nota = $(this).find('nota').text().trim();
                            if (nota.length > 0 && nota != '-') {
                                var name = $(this).find('descripcion').text().trim();
                                var grade = classroom.add_grade(name, nota, false);
                                if (grade) {
                                    grade.notify(classroom.get_acronym());
                                }
                            }
                        }
                    });

                    if (classroom) {
                        classroom.has_grades = true;
                        var nota = $(this).find('notaFinal').text().trim();
                        if (nota.length > 0 && nota != '-') {
                            var grade = classroom.add_grade('FA', nota, true);
                            if (grade) {
                                grade.notify(classroom.get_acronym());
                            }
                        }

                        nota = $(this).find('notaFinalContinuada').text().trim();
                        if (nota.length > 0 && nota != '-') {
                            var grade = classroom.add_grade('FC', nota, false);
                            if (grade) {
                                grade.notify(classroom.get_acronym());
                            }
                        }
                    }
                });
            });
        });
    }

    function retrieve_agenda() {
        var args = {
            'app:mobile': true,
            'app:cache': false,
            'app:only' : 'agenda',
            'app:Delta' : 365
        };
        return $queue.get('/rb/inici/grid.rss', args, false).then(function(resp) {
            var items = $(resp).find('item category:contains(\'CALENDAR\')').parents('item');
            if (items.length > 0) {
                items.each(function() {
                    var json = rssitem_to_json(this);

                    // General events
                    if (parseInt(json.EVENT_TYPE) == 16) {
                        var title = json.title + ' ' + json.description;
                        var evnt = new CalEvent(title, json.guid, 'UOC');
                        evnt.start = $date.getDate(json.pubDate, true);
                        $classes.add_event(evnt);
                    }
                    // Classroom events now are parsed in other places.
                    //parse_agenda_event(json);
                });
            }
        });
    }

    function save_mail(mails) {
        var old_mails = $settings.get_mails_unread();
        $settings.save_mails_unread(mails);
        $debug.print("Check mails: "+mails);
        if (mails > 0 && old_mails < mails && mails >= $settings.get_critical()) {
            $notifications.notify('NOTIFICATION_MAIL', {messages: mails});
        }
    }

    function retrieve_resource(classroom, resource) {
        if (resource.type == "externallink") {
            return $q.when();
        }

        var args = {
            sectionId : '-1',
            pageSize : 0,
            pageCount: 0,
            classroomId: classroom.domain,
            subjectId: classroom.domainassig,
            resourceId: resource.code
        };
        return $queue.get('/webapps/aulaca/classroom/LoadResource.action', args, false).then(function(data) {
            try {
                resource.type = data.resource.widgetType;

                if (resource.type == "messagelist") {
                    resource.set_messages(data.resource.newItems, data.resource.totalItems);
                } else if (resource.type == "blog") {
                    resource.news = !!data.resource.missatgesNousBlog;
                }
            } catch(err) {
                $debug.error(err);
            }
            classroom.add_resource(resource);
        });
    }

    function retrieve_consultor(classroom) {
        var args = {
            classroomId : classroom.domain,
            subjectId : classroom.domainassig
        };
        return $queue.get('/webapps/aulaca/classroom/UsersList.action', args, false).then(function(data) {
            var user;
            try {
                if (data.tutorUsers[0]) {
                    user = data.tutorUsers[0];
                    classroom.consultor = user.fullName;
                    classroom.consultormail = user.email;
                    classroom.consultorlastviewed = user.lastLoginTime;
                    return;
                }
                if (data.referenceUsers[0]) {
                    user = data.referenceUsers[0];
                    classroom.consultor = user.fullName;
                    classroom.consultormail = user.email;
                    classroom.consultorlastviewed = user.lastLoginTime;
                }
            } catch(err) {
                $debug.error(err);
            }
        });
    }

    function retrieve_timeline(classroom) {
        var args = {
            classroomId: classroom.domain,
            subjectId: classroom.domainassig,
            javascriptDisabled: false
        };
        return $queue.post('/webapps/aulaca/classroom/timeline/timeline', args, false).then(function(data) {
            for (var i in data.events) {
                var event = data.events[i];
                var class_event = classroom.get_event(event.id);
                if (class_event) {
                    class_event.completed = event.completed;
                }
            }
        });
    }

    function retrieve_final_exams_event() {
        var idp = $settings.get_idp();
        if (!idp) {
            return $q.when();
        }

        // Stop retrieving this when exams are over
        var classrooms = $classes.get_notified();
        var exams = false;
        for(var x in classrooms) {
            var classroom = classrooms[x];
            if (classroom.exams && classroom.exams.date) {
                exams = $date.compareDates(exams, classroom.exams.date) > 0 ? exams : classroom.exams.date;
            }
        }
        if (exams && $date.isBeforeToday(exams)) {
            return $q.when();
        }

        var any = $classes.get_max_any();
        var args = {
            "F": "edu.uoc.gepaf.fullpersonalpaf.AppFactory",
            "I": [{
                "O": 'xUK0l32plsYSkUc00vYpZ2oukRM=',
                "P": ['' + any, "1", '' + idp, "ESTUDIANT"]
            }]
        };
        // Always GAT_EXP, not dependant on UOCi
        return $queue.json('/tren/trenacc/webapp/GEPAF.FULLPERSONAL/gwtRequest', args, false).then(function(resp) {
            try {
                var objects = resp.O;
                for (var x in objects) {
                    var object = objects[x].P;
                    if (object.veureAula) {
                        var code = object.codAssignatura;
                        var classroom = $classes.search('subject_code', code);
                        if (classroom) {
                            var exam = {};
                            if (object.indExam == 'S') {
                                exam.date = $date.getDate(object.dataExamenFormatada, true);
                                exam.seu =  object.descSeu;
                                exam.timeEX =  $date.getTimeFromNumber(object.horaIniciExamen) + ' - ' + $date.getTimeFromNumber(object.horaFiExamen);
                                exam.placeEX =  object.llocExam;
                            }
                            if (object.indProva == 'S') {
                                exam.date = $date.getDate(object.dataExamenFormatada, true);
                                exam.seu = object.descSeu;
                                exam.timePS =  $date.getTimeFromNumber(object.horaIniciProva) + ' - ' + $date.getTimeFromNumber(object.horaFiProva);
                                exam.placePS = object.llocProva;
                            }
                            classroom.exams = exam;
                        }
                    }
                }

            } catch(err) {
                $debug.error(err);
            }
        });
    }

    function retrieve_final_grades(classroom) {
        if (!classroom.exped || !classroom.subject_code || classroom.final_grades || !classroom.all_events_completed(true)) {
            return $q.when();
        }

        // Stop retrieving this when exams are not done
        if (classroom.exams && classroom.exams.date && !$date.isBeforeToday(classroom.exams.date) && !$date.isToday(classroom.exams.date)) {
            $debug.print('Exam not done, not retrieving final grades for ' + classroom.acronym);
            return $q.when();
        }

        var args = {
            "F": "edu.uoc.gat.cexped.AppFactory",
            "I": [{
                "O": 'Od9l_GxbvdWUtIsyoEt2IWynnbk=',
                "P": [classroom.subject_code, parseInt(classroom.exped)]
            }]
        };
        // Always GAT_EXP, not dependant on UOCi
        return $queue.json( '/tren/trenacc/webapp/GAT_EXP.CEXPEDWEB/gwtRequest', args, false).then(function(resp) {
            try {
                var grades = false;
                var numConvoc = 0;
                if (classroom.any) {
                    for (var x in resp.O) {
                        if (resp.O[x].P.anyAcademico == classroom.any) {
                            grades = resp.O[x].P;
                        } else {
                            numConvoc = Math.max(numConvoc, resp.O[x].P.numConvocatoriaActual);
                        }
                    }
                }

                if (!grades) {
                    grades = resp.O.shift().P;
                }
                $debug.print("Grades found!");
                $debug.print(grades);

                var prov = grades.numConvocatoriaActual <= numConvoc;
                var types = ['C', 'P', 'FC', 'PS', 'PV', 'EX', 'PF',  'FE', 'FA'];

                for(var i in types) {
                    var type = types[i];
                    var lettername = "codCalif"+type;
                    var numbername = "numCalif"+type;
                    var letter = grades[lettername];
                    if (typeof letter != 'undefined' && letter != '' && letter != 'N') {
                        var nota = letter;
                        var number = grades[numbername];
                        if (typeof number != 'undefined' && number != '') {
                            nota += " " + number;
                        }
                        var grade = classroom.add_grade(type, nota, prov);
                        if (grade) {
                            grade.notify(classroom.get_acronym());
                        }
                    }
                }

                if (!prov) {
                    classroom.final_grades = true;
                }
            } catch(err) {
                $debug.error(err);
            }
        });
    }

    function retrieve_stats(classroom) {
        if (!classroom.has_grades || !classroom.subject_code || classroom.stats || !classroom.all_events_completed(true)) {
            return $q.when();
        }

        // Stop retrieving this when exams are not done
        if (classroom.exams && classroom.exams.date && !$date.isBeforeToday(classroom.exams.date) && !$date.isToday(classroom.exams.date)) {
            $debug.print('Exam not done, not retrieving stats for '+classroom.acronym);
            return $q.when();
        }

        var args = {modul: $settings.get_gat() + '.ESTADNOTES/estadis.assignatures',
                    assig: classroom.subject_code,
                    pAnyAcademic: classroom.any
                };
        return $queue.get('/tren/trenacc', args, false).then(function(data) {
            var index = data.indexOf("addRow");
            if (index != -1) {
                $notifications.notify('NOT_STATS', {class: classroom.get_acronym()});
                classroom.stats = true;
            }
        });
    }

    // UI!!! NOT used
    function retrieve_pac_stats(classroom, button) {
        var args = {
            codiTercers : classroom.subject_code,
            anyAcademic : classroom.any,
            numAula: classroom.aula,
            type: 't' // If not present only shows the current classroom
        };

        return $queue.get('/webapps/rac/getEstadisticasAsignaturaAjax.action', args, false).then(function(data) {
            $debug.print(data);
            //UI.fill_pac_stats(classroom, data);
            $(button).removeClass('spin');
            return data;
        });
    }

    self.retrieve_materials = function(classroom) {
        var args = {
            codAssig : classroom.subject_code
        };
        return $queue.get('/webapps/mymat/listMaterialsAjax.action', args).then(function(data) {
            var material;
            if (data.dades) {
                var materials = [];
                for (var x in data.dades) {
                    var dada = data.dades[x];
                    if (dada.defecte) {
                        if (material && material.title && material.title == dada.titol) {
                            for (var y in dada.formats) {
                                material.icons.push(get_icon_link(dada.formats[y]));
                            }
                        } else {
                            material = {};
                            material.title = dada.titol;
                            material.code = dada.codMaterial;
                            material.icons = [];
                            for (var z in dada.formats) {
                                material.icons.push(get_icon_link(dada.formats[z]));
                            }
                            materials.push(material);
                        }
                    }
                }
                return materials;
            } else {
                $q.reject();
            }
        });

        function get_icon_link(format) {
            var icon = {};
            switch(format.tipus._name) {
                case 'PDF':
                    icon.icon = 'file';
                    break;
                case 'PDF_GRAN':
                    icon.icon = 'text-height';
                    break;
                case 'AUDIOLLIBRE':
                    icon.icon = 'headphones';
                    break;
                case 'VIDEOLLIBRE':
                    icon.icon = 'facetime-video';
                    break;
                case 'WEB':
                    icon.icon = 'link';
                    break;
                case 'EPUB':
                    icon.icon = 'book';
                    break;
                case 'MOBIPOCKET':
                    icon.icon = 'phone';
                    break;
                case 'HTML5':
                    icon.icon = 'cloud';
                    break;
                case 'PROGRAMARI_EN_LINIA':
                    icon.icon = 'wrench';
                    break;
            }

            icon.description = format.tipus.nom || "";
            if (format.tipus.desc && icon.description != format.tipus.desc) {
                icon.description += ': '+format.tipus.desc;
            }
            icon.url = format.url;

            return icon;
        }
    };

    self.retrieve_users = function(classroom) {
        var args = {
            classroomId : classroom.domain,
            subjectId : classroom.domainassig
        };
        return $queue.get('/webapps/aulaca/classroom/UsersList.action', args).then(function(data) {
            return data;
        });
    };

    function rssitem_to_json(item) {
        try {
            var obj = {};
            $(item).children().each(function() {
                var tagname = $(this).prop("tagName");
                var element = $(this).text();
                if (tagname == 'category' && $(this).attr('domain')) {
                    tagname = $(this).attr('domain');
                } else {
                    /*
                    var element = {};
                    element['inner'] = $(this).html();
                    $(this).each(function() {
                      $.each(this.attributes, function() {
                        // this.attributes is not a plain object, but an array
                        // of attribute nodes, which contain both the name and value
                        if(this.specified) {
                          element[this.name] = this.value;
                        }
                      });
                    });*/
                }
                obj[tagname] = element;
            });

            return obj;
        } catch (e) {
            $debug.error(e.message);
        }
    }


    return self;
});

// TODO http://cv.uoc.edu/webapps/classroom/servlet/GroupServlet?dtId=MULTI&dtIdList=&s=
// //http://cv.uoc.edu/webapps/classroom/servlet/GroupServlet?dtId=MULTI&dtIdList=%27TUTORIA%27&s=