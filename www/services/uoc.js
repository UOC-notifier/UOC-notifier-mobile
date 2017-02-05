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
            setLng : $utils.get_lang(),
            format: 'json'
        };

        return $queue.get('/app/guaita/calendari', args, true, 120).then(function(data) {
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
            for (var i in classrooms) {
                promises.push(retrieve_final_grades(classrooms[i]));
                promises.push(self.retrieve_stats(classrooms[i]));
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
        $classes.add_class(classroom);

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
                        args.idLang =  $utils.get_lang_code();
                        args.eventsId = act.eventId;
                        args.opId = 'view';
                        args.userTypeId = 'ESTUDIANT';
                        args.canCreateEvent = false;
                    }
                }

                evnt.start = $date.getDate(act.startDate, true);
                evnt.end = $date.getDate(act.deliveryDate, true);
                evnt.solution = $date.getDate(act.solutionDate, true);
                evnt.grading = $date.getDate(act.qualificationDate, true);
                classroom.add_event(evnt);
            }
        }

        var promises = [];

        // Parse resources
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

        if (!classroom.final_grades && !classroom.stats && classroom.has_events()) {
            promises.push(retrieve_timeline(classroom));

            if (classroom.has_assignments()) {
                promises.push(retrieve_pac_stats(classroom).then(function(stats) {
                    classroom.pacstats = stats;
                }));
            }
        }
        return $q.all(promises);
    }

    function retrieve_announcements() {
        var args = {
            'app:mobile': true,
            'app:cache': false,
            'app:only' : 'avisos'
        };

        return $queue.get('/rb/inici/grid.rss', args, false, 60).then(function(resp) {
            var announcements = [],
                items = angular.element(resp).find('item');

            angular.forEach(items, function(item) {
                item = rssitem_to_json(item);

                if (item.category == "ANNOUNCEMENT" && item.title != "" && item.description != "") {
                    var announcement = {
                        title: $utils.get_html_realtext(item.title),
                        description: $utils.get_html_realtext(item.description),
                        link: item.link
                    };

                    announcement.date = $date.formatDate(item.pubdate);

                    announcements.push(announcement);
                }
            });
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
                var items = angular.element(resp).find('item');

                angular.forEach(items, function(item) {
                    item = rssitem_to_json(item);
                    var description = item.description,
                        matches = description.match(/:([0-9]+):[0-9]+$/);
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
            var items = angular.element(resp).find('item'),
                classroom = false,
                findCode = false,
                promises = [];

            angular.forEach(items, function(item) {
                item = rssitem_to_json(item);
                var category = item.category[0];

                if (category.indexOf('AULA_TUTOR_DEFINITION') >= 0) {
                    var code = category.split('-')[0],
                        domainId = category.split('-')[1];
                        title = $utils.get_html_realtext(item.title),
                        codiTercers = code.split('_')[0].toUpperCase() || false;

                    if (codiTercers) {
                        var aux = title.split(codiTercers)[0].trim();
                        title = aux ? aux : title;
                    }

                    classroom = $classes.search('domainassig', domainId);
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

                    var tagColor = item.category[1];
                    if (tagColor) {
                        classroom.color = tagColor.split('#')[1].split('-')[0];
                    }

                    if (classroom.notify) {
                        findCode = code + "-AULA_TUTOR_RESOURCES";
                        promises.push(retrieve_consultor(classroom));
                    }
                } else if (findCode && item.category.indexOf(findCode) >= 0) {
                    // Add the resources to the classroom.
                    try {
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
                    } catch (err) {
                        $debug.error(err);
                    }
                }

                if (classroom) {
                    $classes.add_class(classroom);
                }
            });
            return $q.all(promises);
        });
    }

    function retrieve_gradeinfo() {
        if ($classes.is_all_graded()) {
            return $q.when();
        }

        return $queue.get('/rb/inici/api/enrollment/rac.xml', {}, false).then(function(data) {
            var files = angular.element(data).find('listaAsignaturas').parent();
            angular.forEach(files, function(file) {
                file = xml_getChildrenValues(file);
                var exped = file.id;

                var asignaturas = file.listaasignaturas.find('asignatura');
                angular.forEach(asignaturas, function(asignatura) {
                    // If has a children of same type.
                    if (angular.element(asignatura).find('asignatura').length > 0) {
                        return;
                    }
                    asignatura = xml_getChildrenValues(asignatura);

                    var subject_code = asignatura.codigo,
                        classroom = $classes.search('subject_code', subject_code);

                    if (classroom && !classroom.notify) {
                        return;
                    }

                    var actividades = asignatura.listaactividades? asignatura.listaactividades.find('actividad') : [];
                    angular.forEach(actividades, function(actividad) {
                        // If has a children of same type.
                        if (angular.element(actividad).find('actividad').length > 0) {
                            return;
                        }

                        actividad = xml_getChildrenValues(actividad);

                        var eventid = actividad.pacid;
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

                                if (actividad.listaentregas && actividad.listaentregas.length > 0) {
                                    var entrega = actividad.listaentregas[actividad.listaentregas.length - 1];
                                    evnt.viewed = angular.element(entrega).find('fechaDescargaConsultor').html();
                                    changed = true;
                                    evnt.committed = true;
                                }

                                if (actividad.listacomentarios && actividad.listacomentarios.length > 0) {
                                    var lastcomment = actividad.listacomentarios[actividad.listacomentarios.length - 1];
                                    evnt.commenttext = angular.element(lastcomment).find('texto').html();
                                    evnt.commentdate = angular.element(lastcomment).find('fechaComentario').html();
                                    changed = true;
                                }

                                var grade = actividad.nota;
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

                            var nota = actividad.nota;
                            if (nota.length > 0 && nota != '-') {
                                var name = actividad.descripcion,
                                    finalGrade = classroom.add_grade(name, nota, false);
                                if (finalGrade) {
                                    finalGrade.notify(classroom.get_acronym());
                                }
                            }
                        }
                    });

                    if (classroom) {
                        classroom.has_grades = true;
                        var nota = asignatura.notafinal;
                        if (nota.length > 0 && nota != '-') {
                            var notafinal = classroom.add_grade('FA', nota, true);
                            if (notafinal) {
                                notafinal.notify(classroom.get_acronym());
                            }
                        }

                        nota = asignatura.notafinalcontinuada;
                        if (nota.length > 0 && nota != '-') {
                            var notacont = classroom.add_grade('FC', nota, false);
                            if (notacont) {
                                notacont.notify(classroom.get_acronym());
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
        return $queue.get('/rb/inici/grid.rss', args, false, 120).then(function(resp) {
            var items = angular.element(resp).find('item');
            angular.forEach(items, function(item) {
                item = rssitem_to_json(item);

                // General events
                if (item.TYPE == "CALENDAR" && parseInt(item.EVENT_TYPE, 10) == 16) {
                    var title = $utils.get_html_realtext(item.title + ' ' + item.description),
                        evnt = new CalEvent(title, item.guid, 'UOC');
                    evnt.start = $date.getDate(item.pubdate, true);
                    $classes.add_event(evnt);
                }
                // Classroom events now are parsed in other places.
                //parse_agenda_event(item);
            });
        });
    }

    function save_mail(mails) {
        var old_mails = $settings.get_mails_unread();
        $settings.save_mails_unread(mails);
        $debug.print("Check mails: "+mails);
        if (mails > 0 && old_mails < mails && mails >= $settings.get_critical()) {
            $notifications.notify('NOTIFICATION_MAIL', {messages: mails}, 2);
        } else if (mails <= 0) {
            $notifications.cancel_notification(2);
        }
    }

    function retrieve_resource(classroom, resource) {
        if (!$classes.get_notify(classroom.code) || resource.type == "externallink") {
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
        if (!$classes.get_notify(classroom.code)) {
            return $q.when();
        }
        var args = {
            classroomId : classroom.domain,
            subjectId : classroom.domainassig
        };
        return $queue.get('/webapps/aulaca/classroom/UsersList.action', args, false, 120).then(function(data) {
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
        if (!$classes.get_notify(classroom.code)) {
            return $q.when();
        }
        var args = {
            classroomId: classroom.domain,
            subjectId: classroom.domainassig,
            javascriptDisabled: false
        };
        return $queue.post('/webapps/aulaca/classroom/timeline/timeline', args, false, 120).then(function(data) {
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
        return $queue.json('/tren/trenacc/webapp/GEPAF.FULLPERSONAL/gwtRequest', args, false, 120).then(function(resp) {
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
        if (!classroom.exped || !classroom.subject_code || classroom.final_grades || !classroom.all_events_completed(true) || !$classes.get_notify(classroom.code)) {
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

    self.retrieve_stats = function(classroom) {
        if (!classroom.has_grades || !classroom.subject_code || classroom.stats || !classroom.all_events_completed(true)) {
            return $q.when(classroom.stats);
        }

        // Stop retrieving this when exams are not done
        if (classroom.exams && classroom.exams.date && !$date.isBeforeToday(classroom.exams.date) && !$date.isToday(classroom.exams.date)) {
            $debug.print('Exam not done, not retrieving stats for ' + classroom.acronym);
            return $q.when();
        }

        var args = {modul: 'GAT_EXP.ESTADNOTES/estadis.assignatures',
                    assig: classroom.subject_code,
                    pAnyAcademic: classroom.any
                };
        return $queue.get('/tren/trenacc', args, false, 30).then(function(data) {
            var stats = $utils.getParamNames('addRow', data);
            if (stats && stats.length > 0) {
                $notifications.notify('NOT_STATS', {class: classroom.get_acronym()});
                classroom.stats = stats;
                return stats;
            }
        });
    }

    function retrieve_pac_stats(classroom, activity) {
        if (!$classes.get_notify(classroom.code)) {
            return $q.when();
        }

        var args = {
            codiTercers : classroom.subject_code,
            anyAcademic : classroom.any,
            numAula: classroom.aula,
            type: 't' // If not present only shows the current classroom
        };

        return $queue.get('/webapps/rac/getEstadisticasAsignaturaAjax.action', args, false, 20).then(function(data) {
            var stats = {};
            angular.forEach(data.actividades, function(actividad, index) {
                var table = data.dataTables[index],
                    aulas = [];

                angular.forEach(table.cols, function(col, i) {
                    if (i > 0) {
                        aulas[i - 1] =  {
                            name: col.label,
                            labels: [],
                            values: []
                        };
                    }
                });

                angular.forEach(table.rows, function(row) {
                    var label = row.c[0].v;

                    angular.forEach(row.c, function(val, i) {
                        if (i > 0) {
                            var value = val.f.split(' - ');
                            aulas[i - 1].labels.push(label + ' ' + value[1]);
                            aulas[i - 1].values.push(parseInt(value[0], 10));
                        }
                    });
                });

                angular.forEach(aulas, function(aula, i) {
                    var value = aula.values.reduce(function(a, b) {
                        return a + b;
                    }, 0);
                    if (value == 0) {
                        aulas.splice(i);
                    }
                });
                if (aulas.length > 0) {
                    stats[actividad] = aulas;
                }
            });

            return stats;
        });
    }

    self.retrieve_materials = function(classroom) {
        var args = {
            codAssig : classroom.subject_code
        };
        return $queue.get('/webapps/mymat/listMaterialsAjax.action', args, false, 10).then(function(data) {
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
                    icon.icon = 'document';
                    break;
                case 'PDF_GRAN':
                    icon.icon = 'document-text';
                    break;
                case 'AUDIOLLIBRE':
                    icon.icon = 'headphone';
                    break;
                case 'VIDEOLLIBRE':
                    icon.icon = 'videocamera';
                    break;
                case 'WEB':
                    icon.icon = 'link';
                    break;
                case 'EPUB':
                    icon.icon = 'bookmark';
                    break;
                case 'MOBIPOCKET':
                    icon.icon = 'android-phone-portrait';
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
        return $queue.get('/webapps/aulaca/classroom/UsersList.action', args, false, 10).then(function(data) {
            var users = data.studentUsers,
                idp = $settings.get_idp();

            users = users.filter(function(user) {
                return user.userNumber != idp;
            });

            users.sort(function(x, y) {
                return (x.connected === y.connected)? 0 : x.connected? -1 : 1;
            });
            return users;
        });
    };

    function rssitem_to_json(item) {
        try {
            var obj = {},
                items = angular.element(item).children();

            angular.forEach(items, function(item) {
                item = angular.element(item);
                var tagname = item.prop("tagName").toLowerCase();
                var element = item.text().trim();
                if (tagname == 'category' && item.attr('domain')) {
                    tagname = item.attr('domain');
                } else {
                    /*
                    TODO: Remove Jquery dependencies
                    var element = {};
                    element['inner'] = item.html();
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
                if (typeof obj[tagname] == "undefined") {
                    obj[tagname] = element;
                } else if (typeof obj[tagname] == "array" || typeof obj[tagname] == "object") {
                    obj[tagname].push(element);
                } else {
                    var oldElement = obj[tagname];
                    obj[tagname] = [oldElement, element];
                }
            });
            $debug.log(obj);

            return obj;
        } catch (e) {
            $debug.error(e.message);
        }
    }

    function xml_getChildrenValues(item) {
         try {
            var obj = {},
                tagname,
                item = angular.element(item);
            if (typeof item == "array") {
                item = item[0];
            }

            angular.forEach(item.children(), function(child) {
                child = angular.element(child);
                tagname = child.prop("tagName").toLowerCase();
                if (child.children().length > 0) {
                    obj[tagname] = child.children();
                } else {
                    obj[tagname] = child.text().trim();
                }
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