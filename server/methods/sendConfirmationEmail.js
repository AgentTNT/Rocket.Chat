import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';

import * as Mailer from '../../app/mailer';
import { Users } from '../../app/models';
import { settings } from '../../app/settings';

let template = '';

Meteor.startup(() => {
	Mailer.getTemplateWrapped('Verification_Email', (value) => {
		template = value;
	});
});

Meteor.methods({
	sendConfirmationEmail(to) {
		check(to, String);
		
		let email = to.trim();

		const user = Users.findOneByEmailAddress(email);

		if (!user) {
			return false;
		}
		
		const regex = new RegExp(`^${ s.escapeRegExp(email) }$`, 'i');
		email = (user.emails || []).map((item) => item.address).find((userEmail) => regex.test(userEmail));
		
		const subject = Mailer.replace(settings.get('Verification_Email_Subject') || '', {
			name: user.name,
			email,
		});

		const html = Mailer.replace(template, {
			name: user.name,
			email,
		});
		
		Accounts.emailTemplates.from = `${ settings.get('Site_Name') } <${ settings.get('From_Email') }>`;		
		
		try {
			
		Accounts.emailTemplates.verifyEmail.subject = function(/* userModel*/) {
			return subject;
		};
		
		Accounts.emailTemplates.verifyEmail.html = function(userModel, url) {
			return Mailer.replacekey(html, { Verification_Url: url, name: user.name });
		};
		return Accounts.sendVerificationEmail(user._id, email);
		} catch (error) {
			throw new Meteor.Error('error-email-send-failed', `Error trying to send email: ${ error.message }`, {
				method: 'registerUser',
				message: error.message,
			});
		}
	},
});
